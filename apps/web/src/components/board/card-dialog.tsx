import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CardDto, CardPriority, PRIORITIES } from '@moongatracker/shared-types';
import { RiCloseLine, RiDeleteBin6Line } from '@remixicon/react';
import { deleteCard, updateCard } from '../../api/cards';
import { addComment, listComments } from '../../api/comments';
import { fetchActivity, revertActivity } from '../../api/activity';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function CardDialog({
  card,
  onClose,
  onChanged,
}: {
  card: CardDto;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body ?? '');
  const [priority, setPriority] = useState<CardPriority | null>(card.priority);
  const [busy, setBusy] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [bottomTab, setBottomTab] = useState<'comments' | 'history'>(
    'comments',
  );

  const comments = useQuery({
    queryKey: ['comments', card.id],
    queryFn: () => listComments(card.id),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activity', card.id],
    queryFn: () => fetchActivity(card.id),
    enabled: bottomTab === 'history',
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

  async function handleSetPriority(p: CardPriority | null) {
    setPriority(p);
    await updateCard(card.id, { priority: p });
    onChanged();
  }

  async function postComment() {
    const value = commentBody.trim();
    if (!value) return;
    await addComment(card.id, value);
    setCommentBody('');
    qc.invalidateQueries({ queryKey: ['comments', card.id] });
  }

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

          {/* priority */}
          <div>
            <SectionTitle>приоритет</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {[...PRIORITIES, null].map((p) => (
                <button
                  key={p?.key ?? 'none'}
                  type="button"
                  onClick={() => handleSetPriority(p?.key ?? null)}
                  style={{ borderColor: p ? p.color : undefined }}
                  className={cn(
                    'rounded border px-2 py-1 text-[10px]',
                    priority === (p?.key ?? null)
                      ? 'opacity-100'
                      : 'opacity-40',
                  )}
                >
                  {p?.label ?? 'Нет'}
                </button>
              ))}
            </div>
          </div>

          {/* comments / history tabs */}
          <div>
            <div className="flex gap-1 border-b border-border mb-3">
              {(['comments', 'history'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBottomTab(t)}
                  className={[
                    'px-3 py-1.5 text-[10px] uppercase tracking-wider transition-colors',
                    bottomTab === t
                      ? 'border-b-2 border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {t === 'comments' ? 'Комментарии' : 'История'}
                </button>
              ))}
            </div>

            {bottomTab === 'comments' && (
              <>
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
              </>
            )}

            {bottomTab === 'history' && (
              <div className="space-y-2">
                {activities.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Нет истории агентских действий
                  </p>
                )}
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-2 rounded border border-border/50 px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: '#f59e0b' }}
                        >
                          агент
                        </span>
                        <span className="text-[11px] text-foreground">
                          {a.action}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString('ru')}
                      </p>
                      {a.after && (
                        <p className="text-[10px] text-muted-foreground">
                          {Object.entries(a.after)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    {a.before && a.action !== 'revert' && (
                      <button
                        onClick={async () => {
                          await revertActivity(a.id);
                          onChanged();
                        }}
                        className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        Откатить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
