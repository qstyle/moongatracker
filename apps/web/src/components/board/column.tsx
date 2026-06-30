import { useRef, useState } from 'react';
import { CardDto, ColumnDto } from '@moongatracker/shared-types';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RiCheckboxBlankCircleLine, RiMoreLine } from '@remixicon/react';
import { updateColumn, deleteColumn } from '../../api/columns';
import { CardTile } from './card-tile';
import { CardComposer } from './card-composer';

export function Column({
  column,
  index,
  projectId,
  disabled,
  onChanged,
  onSelectCard,
}: {
  column: ColumnDto;
  index: number;
  projectId: string;
  disabled?: boolean;
  onChanged: () => void;
  onSelectCard: (card: CardDto) => void;
}) {
  const count = column.cards.length;
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled });

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function commitRename() {
    setRenaming(false);
    const value = renameValue.trim();
    if (!value || value === column.title) return;
    await updateColumn(column.id, { title: value });
    onChanged();
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (count > 0) return;
    await deleteColumn(column.id);
    onChanged();
  }

  return (
    <section className="flex w-[280px] shrink-0 flex-col self-start rounded-lg bg-neutral-300/15 p-3">
      <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground/50">
            {String(index + 1).padStart(2, '0')}
          </span>
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setRenameValue(column.title);
                  setRenaming(false);
                }
              }}
              className="w-32 border-b border-foreground/40 bg-transparent text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground outline-none"
            />
          ) : (
            <h2
              className="cursor-default text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground"
              onDoubleClick={() => {
                setRenameValue(column.title);
                setRenaming(true);
              }}
              title="Двойной клик для переименования"
            >
              {column.title}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="min-w-5 border border-border px-1.5 text-center text-[10px] leading-4 tabular-nums text-muted-foreground">
            {count}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center text-muted-foreground/50 transition-colors hover:text-foreground"
              title="Действия"
            >
              <RiMoreLine className="size-3.5" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 min-w-[120px] border border-border bg-card shadow-lg">
                  <button
                    type="button"
                    disabled={count > 0}
                    onClick={handleDelete}
                    className="flex w-full items-center px-3 py-2 text-left text-[11px] text-destructive transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Удалить
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={
          'flex min-h-16 flex-col gap-2 transition-colors ' +
          (isOver && !disabled ? 'bg-accent/40' : '')
        }
      >
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {count === 0 ? (
            <div className="flex items-center justify-center gap-1.5 border border-dashed border-border/70 py-6 text-[10px] uppercase tracking-wider text-muted-foreground/40">
              <RiCheckboxBlankCircleLine className="size-3" />
              пусто
            </div>
          ) : (
            column.cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                disabled={disabled}
                onClick={() => onSelectCard(card)}
              />
            ))
          )}
        </SortableContext>

        <CardComposer
          projectId={projectId}
          columnId={column.id}
          onAdded={onChanged}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
