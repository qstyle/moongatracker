import { useEffect, useState } from 'react';
import { CardDto } from '@moongatracker/shared-types';
import { RiCloseLine, RiDeleteBin6Line } from '@remixicon/react';
import { deleteCard, updateCard } from '../../api/cards';

export function CardDialog({
  card,
  onClose,
  onChanged,
}: {
  card: CardDto;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body ?? '');
  const [busy, setBusy] = useState(false);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-border bg-card shadow-xl"
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

        <div className="flex flex-col gap-3 p-4">
          <input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            className="border border-border bg-background px-2.5 py-2 text-[13px] font-medium outline-none transition-colors focus:border-foreground/40"
          />
          <textarea
            value={body}
            rows={5}
            placeholder="Описание…"
            onChange={(e) => setBody(e.target.value)}
            className="resize-none border border-border bg-background px-2.5 py-2 text-[12px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/40"
          />
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
