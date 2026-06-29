import { CardDto, ColumnDto } from '@moongatracker/shared-types';
import { RiCheckboxBlankCircleLine } from '@remixicon/react';
import { CardTile } from './card-tile';
import { CardComposer } from './card-composer';

export function Column({
  column,
  index,
  boardId,
  onChanged,
  onSelectCard,
}: {
  column: ColumnDto;
  index: number;
  boardId: string;
  onChanged: () => void;
  onSelectCard: (card: CardDto) => void;
}) {
  const count = column.cards.length;

  return (
    <section className="flex w-[280px] shrink-0 flex-col">
      <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground/50">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
            {column.title}
          </h2>
        </div>
        <span className="min-w-5 border border-border px-1.5 text-center text-[10px] leading-4 tabular-nums text-muted-foreground">
          {count}
        </span>
      </header>

      <div className="flex flex-col gap-2">
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
              onClick={() => onSelectCard(card)}
            />
          ))
        )}

        <CardComposer
          boardId={boardId}
          columnKey={column.key}
          onAdded={onChanged}
        />
      </div>
    </section>
  );
}
