import { useState } from 'react';
import { ActorDto, CardDto, ColumnDto } from '@moonga-studio/shared-types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { RiCheckboxBlankCircleLine, RiMoreLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateColumn, deleteColumn } from '../../api/columns';
import { CardTile } from './card-tile';
import { CardComposer } from './card-composer';

export function Column({
  column,
  index,
  boardId,
  disabled,
  onChanged,
  onSelectCard,
  resolveActor,
  cardKeyOf,
}: {
  column: ColumnDto;
  index: number;
  boardId: string;
  disabled?: boolean;
  onChanged: () => void;
  onSelectCard: (card: CardDto) => void;
  resolveActor: (actor: ActorDto | null) => ActorDto | null;
  cardKeyOf: (cardNumber: number) => string;
}) {
  const count = column.cards.length;
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled });
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);

  async function commitRename() {
    setRenaming(false);
    const value = renameValue.trim();
    if (!value || value === column.title) return;
    await updateColumn(column.id, { title: value });
    onChanged();
  }

  async function handleDelete() {
    if (count > 0) return;
    await deleteColumn(column.id);
    onChanged();
  }

  return (
    <div className="flex w-70 shrink-0 flex-col self-start rounded-lg bg-neutral-300/15 p-3">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-baseline gap-2">
          <div className="text-xs tabular-nums text-muted-foreground/50">
            {String(index + 1).padStart(2, '0')}
          </div>
          {renaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenameValue(column.title); setRenaming(false); }
              }}
            />
          ) : (
            <div
              className="cursor-default text-xs font-semibold uppercase tracking-[0.14em] text-foreground"
              onDoubleClick={() => { setRenameValue(column.title); setRenaming(true); }}
            >
              {column.title}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="min-w-5 border border-border px-1.5 text-center text-xs leading-4 tabular-nums text-muted-foreground">
            {count}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Меню колонки">
                <RiMoreLine />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => { setRenameValue(column.title); setRenaming(true); }}
              >
                Переименовать
              </DropdownMenuItem>
              <DropdownMenuItem disabled={count > 0} onClick={handleDelete}>
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={'flex min-h-16 flex-col gap-2 transition-colors ' + (isOver && !disabled ? 'bg-accent/40' : '')}
      >
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {count === 0 ? (
            <div className="flex items-center justify-center gap-1.5 border border-dashed border-border/70 py-6 text-xs uppercase tracking-wider text-muted-foreground/40">
              <RiCheckboxBlankCircleLine className="size-3" />
              пусто
            </div>
          ) : (
            column.cards.map((card) => (
              <CardTile key={card.id} card={card} cardKey={cardKeyOf(card.number)} assignee={resolveActor(card.assignee)} disabled={disabled} onClick={() => onSelectCard(card)} />
            ))
          )}
        </SortableContext>

        <CardComposer boardId={boardId} columnId={column.id} onAdded={onChanged} disabled={disabled} />
      </div>
    </div>
  );
}
