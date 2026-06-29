import { useEffect, useState } from 'react';
import { BoardDto, CardDto, ColumnDto } from '@moongatracker/shared-types';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { RiTBoxLine } from '@remixicon/react';
import { VIEWS, ViewId } from '../../lib/views';
import { updateCard } from '../../api/cards';
import { Column } from './column';
import { ViewSwitch } from './view-switch';
import { CardDialog } from './card-dialog';

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px),' +
    'linear-gradient(90deg, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
  backgroundPosition: '-1px -1px',
};

/** Move a card within or across columns, returning a new columns array. */
function computeMove(
  cols: ColumnDto[],
  activeId: string,
  overId: string,
): ColumnDto[] {
  const fromCol = cols.find((c) => c.cards.some((k) => k.id === activeId));
  if (!fromCol) return cols;
  const card = fromCol.cards.find((k) => k.id === activeId);
  if (!card) return cols;

  // overId is either a column key (empty area) or a card id
  let toCol = cols.find((c) => c.key === overId);
  let overIndex = -1;
  if (!toCol) {
    toCol = cols.find((c) => c.cards.some((k) => k.id === overId));
    if (toCol) overIndex = toCol.cards.findIndex((k) => k.id === overId);
  }
  if (!toCol) return cols;

  if (fromCol.key === toCol.key) {
    const oldIndex = fromCol.cards.findIndex((k) => k.id === activeId);
    const newIndex = overIndex === -1 ? fromCol.cards.length - 1 : overIndex;
    if (oldIndex === newIndex) return cols;
    return cols.map((c) =>
      c.key === fromCol.key
        ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) }
        : c,
    );
  }

  return cols.map((c) => {
    if (c.key === fromCol.key) {
      return { ...c, cards: c.cards.filter((k) => k.id !== activeId) };
    }
    if (c.key === toCol!.key) {
      const insertAt = overIndex === -1 ? c.cards.length : overIndex;
      const next = [...c.cards];
      next.splice(insertAt, 0, card);
      return { ...c, cards: next };
    }
    return c;
  });
}

export function Board({
  board,
  onChanged,
}: {
  board: BoardDto;
  onChanged: () => void;
}) {
  const [view, setView] = useState<ViewId>('all');
  const [selected, setSelected] = useState<CardDto | null>(null);
  const [columns, setColumns] = useState<ColumnDto[]>(board.columns);
  const [activeCard, setActiveCard] = useState<CardDto | null>(null);

  // Re-sync local board state whenever the server copy changes.
  useEffect(() => setColumns(board.columns), [board]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const def = VIEWS.find((v) => v.id === view) ?? VIEWS[0];
  const visible = def.columns
    ? columns.filter((c) => def.columns!.includes(c.key))
    : columns;
  const total = columns.reduce((n, c) => n + c.cards.length, 0);

  async function persist(next: ColumnDto[]) {
    // Original positions from the server truth (board prop).
    const original = new Map<string, { key: string; index: number }>();
    board.columns.forEach((c) =>
      c.cards.forEach((card, i) =>
        original.set(card.id, { key: c.key, index: i }),
      ),
    );

    const updates: Promise<unknown>[] = [];
    next.forEach((col) =>
      col.cards.forEach((card, index) => {
        const before = original.get(card.id);
        if (!before || before.key !== col.key || before.index !== index) {
          updates.push(
            updateCard(card.id, { columnKey: col.key, order: index }),
          );
        }
      }),
    );

    if (updates.length) {
      try {
        await Promise.all(updates);
      } finally {
        onChanged();
      }
    }
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    const card = columns.flatMap((c) => c.cards).find((k) => k.id === id);
    setActiveCard(card ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const next = computeMove(columns, activeId, overId);
    if (next === columns) return;
    setColumns(next);
    persist(next);
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center bg-primary text-primary-foreground">
            <RiTBoxLine className="size-4" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm font-semibold tracking-tight">
              moongatracker
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-[12px] text-muted-foreground">
              {board.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">
            {total} задач
          </span>
          <ViewSwitch value={view} onChange={setView} />
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <main
          className="flex flex-1 items-start gap-5 overflow-x-auto px-5 py-6"
          style={GRID_BG}
        >
          {visible.map((column, i) => (
            <Column
              key={column.id}
              column={column}
              index={i}
              boardId={board.id}
              onChanged={onChanged}
              onSelectCard={setSelected}
            />
          ))}
        </main>

        <DragOverlay>
          {activeCard ? (
            <article className="cursor-grabbing border border-foreground/40 bg-card px-3 py-2.5 shadow-lg">
              <p className="text-[13px] font-medium leading-snug text-card-foreground">
                {activeCard.title}
              </p>
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selected && (
        <CardDialog
          card={selected}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
