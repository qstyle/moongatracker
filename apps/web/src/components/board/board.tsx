import { useEffect, useMemo, useState } from 'react';
import { ProjectDto, CardDto, ColumnDto } from '@moongatracker/shared-types';
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
import { FilterState, useCardFilter } from '../../lib/use-card-filter';
import { updateCard } from '../../api/cards';
import { updateProject } from '../../api/projects';
import { createColumn } from '../../api/columns';
import { Column } from './column';
import { CardDialog } from './card-dialog';
import { FilterBar } from './filter-bar';

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

  let toCol = cols.find((c) => c.id === overId); // column droppable
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
    return cols.map((c) =>
      c.id === fromCol.id
        ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) }
        : c,
    );
  }

  return cols.map((c) => {
    if (c.id === fromCol.id)
      return { ...c, cards: c.cards.filter((k) => k.id !== activeId) };
    if (c.id === toCol!.id) {
      const insertAt = overIndex === -1 ? c.cards.length : overIndex;
      const next = [...c.cards];
      next.splice(insertAt, 0, card);
      return { ...c, cards: next };
    }
    return c;
  });
}

export function Board({
  project,
  onChanged,
}: {
  project: ProjectDto;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<CardDto | null>(null);
  const [columns, setColumns] = useState<ColumnDto[]>(project.columns);
  const [activeCard, setActiveCard] = useState<CardDto | null>(null);
  const [filter, setFilter] = useState<FilterState>({ search: '' });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const [addingColumn, setAddingColumn] = useState(false);

  useEffect(() => {
    setColumns(project.columns);
    setNameInput(project.name);
  }, [project]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filterActive = filter.search !== '';
  const filteredVisible = useCardFilter(columns, filter);

  const displayTotal = useMemo(
    () =>
      filterActive
        ? filteredVisible.reduce((n, c) => n + c.cards.length, 0)
        : columns.reduce((n, c) => n + c.cards.length, 0),
    [filterActive, filteredVisible, columns],
  );

  async function persist(next: ColumnDto[]) {
    const original = new Map<string, { columnId: string; index: number }>();
    project.columns.forEach((c) =>
      c.cards.forEach((card, i) =>
        original.set(card.id, { columnId: c.id, index: i }),
      ),
    );

    const updates: Promise<unknown>[] = [];
    next.forEach((col) =>
      col.cards.forEach((card, index) => {
        const before = original.get(card.id);
        if (!before || before.columnId !== col.id || before.index !== index) {
          updates.push(updateCard(card.id, { columnId: col.id, order: index }));
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
          {editingName ? (
            <input
              autoFocus
              className="rounded border border-border bg-muted px-2 py-0.5 text-[12px] text-foreground outline-none"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (nameInput.trim() && nameInput.trim() !== project.name) {
                  await updateProject(project.id, nameInput.trim());
                  onChanged();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setNameInput(project.name);
                  setEditingName(false);
                }
              }}
            />
          ) : (
            <span
              className="cursor-pointer text-[12px] text-muted-foreground hover:text-foreground"
              onClick={() => setEditingName(true)}
            >
              {project.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">
            {displayTotal} задач
          </span>
          <FilterBar filter={filter} onChange={setFilter} />
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full flex-1 gap-4 overflow-x-auto p-4">
          {filteredVisible.map((col, i) => (
            <Column
              key={col.id}
              column={col}
              index={i}
              projectId={project.id}
              disabled={filterActive}
              onSelectCard={setSelected}
              onChanged={onChanged}
            />
          ))}

          {/* Add column button */}
          <div className="flex shrink-0 w-[280px] items-start pt-1">
            {addingColumn ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = (fd.get('title') as string)?.trim();
                  if (title) {
                    await createColumn(project.id, title);
                    onChanged();
                  }
                  setAddingColumn(false);
                }}
                className="flex w-full gap-2"
              >
                <input
                  autoFocus
                  name="title"
                  placeholder="Название колонки"
                  className="flex-1 rounded border border-border bg-muted px-2 py-1 text-[12px] text-foreground outline-none"
                  onKeyDown={(e) =>
                    e.key === 'Escape' && setAddingColumn(false)
                  }
                />
                <button
                  type="submit"
                  className="rounded bg-foreground px-3 py-1 text-[11px] text-background"
                >
                  Добавить
                </button>
              </form>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                + Колонка
              </button>
            )}
          </div>
        </div>

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
