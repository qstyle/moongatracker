import { useEffect, useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  BoardDto,
  CardDto,
  ColumnDto,
  formatCardKey,
  parseCardNumber,
} from '@moongatracker/shared-types';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, closestCorners, useSensor, useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { RiTBoxLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterState, useCardFilter } from '../../lib/use-card-filter';
import { useBoardActors } from '../../lib/use-board-actors';
import { fetchCard, updateCard } from '../../api/cards';
import { updateBoard } from '../../api/boards';
import { createColumn } from '../../api/columns';
import { Column } from './column';
import { CardDialog } from './card-dialog';
import { FilterBar } from './filter-bar';

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px),' +
    'linear-gradient(90deg, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
  backgroundPosition: '-1px -1px',
};

function computeMove(cols: ColumnDto[], activeId: string, overId: string): ColumnDto[] {
  const fromCol = cols.find((c) => c.cards.some((k) => k.id === activeId));
  if (!fromCol) return cols;
  const card = fromCol.cards.find((k) => k.id === activeId);
  if (!card) return cols;
  let toCol = cols.find((c) => c.id === overId);
  let overIndex = -1;
  if (!toCol) {
    toCol = cols.find((c) => c.cards.some((k) => k.id === overId));
    if (toCol) overIndex = toCol.cards.findIndex((k) => k.id === overId);
  }
  if (!toCol) return cols;
  if (fromCol.id === toCol.id) {
    const oldIndex = fromCol.cards.findIndex((k) => k.id === activeId);
    const newIndex = overIndex === -1 ? fromCol.cards.length - 1 : overIndex;
    if (oldIndex === newIndex) return cols;
    return cols.map((c) => c.id === fromCol.id ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) } : c);
  }
  return cols.map((c) => {
    if (c.id === fromCol.id) return { ...c, cards: c.cards.filter((k) => k.id !== activeId) };
    if (c.id === toCol!.id) {
      const insertAt = overIndex === -1 ? c.cards.length : overIndex;
      const next = [...c.cards];
      next.splice(insertAt, 0, card);
      return { ...c, cards: next };
    }
    return c;
  });
}

export function Board({ board, onChanged }: { board: BoardDto; onChanged: () => void }) {
  const [, navigate] = useLocation();
  const [cardRouteMatch, cardRouteParams] = useRoute('/boards/:boardId/cards/:cardKey');
  const selectedCardKey = cardRouteMatch ? cardRouteParams.cardKey : null;
  const { resolve } = useBoardActors(board.id);
  const keyOf = (n: number) => formatCardKey(board.name, board.seq, n);
  const [columns, setColumns] = useState<ColumnDto[]>(board.columns);
  const [activeCard, setActiveCard] = useState<CardDto | null>(null);
  const [filter, setFilter] = useState<FilterState>({ search: '' });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(board.name);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  useEffect(() => { setColumns(board.columns); setNameInput(board.name); }, [board]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const filterActive = filter.search !== '';
  const filteredVisible = useCardFilter(columns, filter);
  const displayTotal = useMemo(
    () => filterActive
      ? filteredVisible.reduce((n, c) => n + c.cards.length, 0)
      : columns.reduce((n, c) => n + c.cards.length, 0),
    [filterActive, filteredVisible, columns],
  );

  const openCard = (card: CardDto) =>
    navigate(`/boards/${board.id}/cards/${keyOf(card.number)}`);
  const closeCard = () => navigate(`/boards/${board.id}`);

  // Selected card comes from the URL key (e.g. "РАЗР2-15"). Resolve by the
  // per-board number — the board payload already holds every card. Fall back to
  // id-based fetch only for legacy cuid links (parseCardNumber returns null).
  const selectedNumber = selectedCardKey ? parseCardNumber(selectedCardKey) : null;
  const localSelectedCard = selectedCardKey
    ? columns
        .flatMap((c) => c.cards)
        .find((k) =>
          selectedNumber != null ? k.number === selectedNumber : k.id === selectedCardKey,
        ) ?? null
    : null;
  const { data: fetchedCard } = useQuery({
    queryKey: ['card', selectedCardKey],
    queryFn: () => fetchCard(selectedCardKey as string),
    enabled: !!selectedCardKey && !localSelectedCard && selectedNumber == null,
  });
  const selectedCard = localSelectedCard ?? fetchedCard ?? null;

  async function persist(next: ColumnDto[]) {
    const original = new Map<string, { columnId: string; index: number }>();
    board.columns.forEach((c) => c.cards.forEach((card, i) => original.set(card.id, { columnId: c.id, index: i })));
    const updates: Promise<unknown>[] = [];
    next.forEach((col) => col.cards.forEach((card, index) => {
      const before = original.get(card.id);
      if (!before || before.columnId !== col.id || before.index !== index)
        updates.push(updateCard(card.id, { columnId: col.id, order: index }));
    }));
    if (updates.length) { try { await Promise.all(updates); } finally { onChanged(); } }
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setActiveCard(columns.flatMap((c) => c.cards).find((k) => k.id === id) ?? null);
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

  async function addColumn() {
    const title = newColumnTitle.trim();
    if (!title) return;
    await createColumn(board.id, title);
    setNewColumnTitle('');
    setAddingColumn(false);
    onChanged();
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center bg-primary text-primary-foreground" aria-hidden>
            <RiTBoxLine className="size-4" />
          </div>
          {editingName ? (
            <Input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (nameInput.trim() && nameInput.trim() !== board.name) {
                  await updateBoard(board.id, nameInput.trim());
                  onChanged();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') { setNameInput(board.name); setEditingName(false); }
              }}
            />
          ) : (
            <div className="cursor-pointer text-sm text-muted-foreground hover:text-foreground" onClick={() => setEditingName(true)}>
              {board.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-xs tabular-nums text-muted-foreground sm:block">{displayTotal} задач</div>
          <FilterBar filter={filter} onChange={setFilter} />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex h-full flex-1 gap-4 overflow-x-auto p-4" style={GRID_BG}>
          {filteredVisible.map((col, i) => (
            <Column key={col.id} column={col} index={i} boardId={board.id} disabled={filterActive} onSelectCard={openCard} onChanged={onChanged} resolveActor={resolve} cardKeyOf={keyOf} />
          ))}
          <div className="flex w-70 shrink-0 items-start pt-1">
            {addingColumn ? (
              <div className="flex w-full gap-2">
                <Input
                  autoFocus
                  value={newColumnTitle}
                  placeholder="Название колонки"
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addColumn();
                    if (e.key === 'Escape') setAddingColumn(false);
                  }}
                />
                <Button size="sm" onClick={addColumn}>Добавить</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAddingColumn(true)}>+ Колонка</Button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="cursor-grabbing border border-foreground/40 bg-card px-3 py-2.5 shadow-lg">
              <div className="text-sm font-medium leading-snug text-card-foreground">{activeCard.title}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCard && <CardDialog card={selectedCard} cardKey={keyOf(selectedCard.number)} onClose={closeCard} onChanged={onChanged} />}
    </div>
  );
}
