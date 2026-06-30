import { useState } from 'react';
import { RiAddLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <RiAddLine />
        добавить
      </Button>
    );
  }

  return (
    <div className="border border-foreground/30 bg-card p-2">
      <Textarea
        autoFocus
        rows={2}
        value={title}
        placeholder="Заголовок карточки…"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === 'Escape') reset();
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={busy || !title.trim()}>
          добавить
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          отмена
        </Button>
      </div>
    </div>
  );
}
