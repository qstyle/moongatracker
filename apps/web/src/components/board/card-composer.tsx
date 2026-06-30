import { useState } from 'react';
import { RiAddLine } from '@remixicon/react';
import { createCard } from '../../api/cards';

export function CardComposer({
  boardId,
  columnId,
  onAdded,
  disabled,
}: {
  boardId: string;
  columnId: string;
  onAdded: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setOpen(false);
    setTitle('');
  }

  async function submit() {
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await createCard({ boardId, columnId, title: value });
      reset();
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-1 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <RiAddLine className="size-3.5" />
        добавить
      </button>
    );
  }

  return (
    <div className="border border-foreground/30 bg-card p-2">
      <textarea
        autoFocus
        rows={2}
        value={title}
        placeholder="Заголовок карточки…"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') reset();
        }}
        className="w-full resize-none bg-transparent text-[13px] leading-snug text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !title.trim()}
          className="bg-primary px-2 py-1 text-[10px] uppercase tracking-wider text-primary-foreground disabled:opacity-40"
        >
          добавить
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          отмена
        </button>
      </div>
    </div>
  );
}
