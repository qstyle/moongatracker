import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CardDto, LabelDto } from '@moongatracker/shared-types';
import { RiCloseLine, RiDeleteBin6Line } from '@remixicon/react';
import { deleteCard, updateCard } from '../../api/cards';
import { addComment, listComments } from '../../api/comments';
import {
  attachLabel,
  createLabel,
  detachLabel,
  listLabels,
} from '../../api/labels';
import { LabelChip } from './label-chip';

const PALETTE = [
  '#e11d48',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#64748b',
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function CardDialog({
  card,
  boardId,
  onClose,
  onChanged,
}: {
  card: CardDto;
  boardId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body ?? '');
  const [labels, setLabels] = useState<LabelDto[]>(card.labels);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [commentBody, setCommentBody] = useState('');

  const comments = useQuery({
    queryKey: ['comments', card.id],
    queryFn: () => listComments(card.id),
  });
  const boardLabels = useQuery({
    queryKey: ['labels', boardId],
    queryFn: () => listLabels(boardId),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await updateCard(card.id, {
        title: value,
        body: body.trim() ? body : null,
      });
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteCard(card.id);
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function toggleLabel(label: LabelDto) {
    const has = labels.some((l) => l.id === label.id);
    if (has) {
      setLabels((p) => p.filter((l) => l.id !== label.id));
      await detachLabel(card.id, label.id);
    } else {
      setLabels((p) => [...p, label]);
      await attachLabel(card.id, label.id);
    }
    onChanged();
  }

  async function addNewLabel() {
    const name = newLabel.trim();
    if (!name) return;
    const label = await createLabel(boardId, name, newColor);
    setNewLabel('');
    qc.invalidateQueries({ queryKey: ['labels', boardId] });
    setLabels((p) => [...p, label]);
    await attachLabel(card.id, label.id);
    onChanged();
  }

  async function postComment() {
    const value = commentBody.trim();
    if (!value) return;
    await addComment(card.id, value);
    setCommentBody('');
    qc.invalidateQueries({ queryKey: ['comments', card.id] });
  }

  const available = (boardLabels.data ?? []).filter(
    (l) => !labels.some((x) => x.id === l.id),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            карточка
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          <input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            className="border border-border bg-background px-2.5 py-2 text-[13px] font-medium outline-none transition-colors focus:border-foreground/40"
          />
          <textarea
            value={body}
            rows={4}
            placeholder="Описание…"
            onChange={(e) => setBody(e.target.value)}
            className="resize-none border border-border bg-background px-2.5 py-2 text-[12px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/40"
          />

          {/* labels */}
          <div>
            <SectionTitle>метки</SectionTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              {labels.map((l) => (
                <LabelChip
                  key={l.id}
                  name={l.name}
                  color={l.color}
                  onRemove={() => toggleLabel(l)}
                />
              ))}
              {available.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLabel(l)}
                  className="inline-flex items-center gap-1 border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span
                    className="size-2"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.name}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex gap-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    style={{ backgroundColor: c }}
                    className={
                      'size-4 ' +
                      (newColor === c
                        ? 'ring-2 ring-foreground ring-offset-1 ring-offset-card'
                        : '')
                    }
                    aria-label={`цвет ${c}`}
                  />
                ))}
              </div>
              <input
                value={newLabel}
                placeholder="новая метка…"
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewLabel()}
                className="flex-1 border border-border bg-background px-2 py-1 text-[11px] outline-none placeholder:text-muted-foreground/50 focus:border-foreground/40"
              />
              <button
                type="button"
                onClick={addNewLabel}
                disabled={!newLabel.trim()}
                className="border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* comments */}
          <div>
            <SectionTitle>
              комментарии {comments.data ? `(${comments.data.length})` : ''}
            </SectionTitle>
            <div className="flex flex-col gap-2">
              {(comments.data ?? []).map((c) => (
                <div
                  key={c.id}
                  className="border border-border bg-background px-2.5 py-2"
                >
                  <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-wider text-muted-foreground">
                    <span
                      className={
                        c.authorType === 'agent'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    >
                      {c.authorType === 'agent' ? 'агент' : 'человек'}
                    </span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-foreground">
                    {c.body}
                  </p>
                </div>
              ))}
              {comments.data && comments.data.length === 0 && (
                <p className="text-[11px] text-muted-foreground/50">
                  пока пусто
                </p>
              )}
            </div>
            <div className="mt-2 flex items-start gap-2">
              <textarea
                value={commentBody}
                rows={2}
                placeholder="Комментарий…"
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    postComment();
                  }
                }}
                className="flex-1 resize-none border border-border bg-background px-2 py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/50 focus:border-foreground/40"
              />
              <button
                type="button"
                onClick={postComment}
                disabled={!commentBody.trim()}
                className="bg-primary px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-primary-foreground disabled:opacity-40"
              >
                отпр
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex items-center gap-1 text-[11px] text-destructive transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <RiDeleteBin6Line className="size-3.5" />
            удалить
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              отмена
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !title.trim()}
              className="bg-primary px-3 py-1.5 text-[10px] uppercase tracking-wider text-primary-foreground disabled:opacity-40"
            >
              сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
