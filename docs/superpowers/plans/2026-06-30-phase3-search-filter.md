# Phase 3: Поиск и фильтры — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить клиентский поиск по тексту + фильтр по лейблам на канбан-доску, без изменений в API и БД.

**Architecture:** Вся фильтрация — derived state поверх уже загруженных данных из `GET /boards`. Новый хук `useCardFilter` фильтрует `ColumnDto[]` в памяти. Новый компонент `FilterBar` живёт в хедере рядом с `ViewSwitch`. DnD блокируется через `disabled` prop в dnd-kit при активном фильтре.

**Tech Stack:** React 18, Vitest + jsdom + @testing-library/react, dnd-kit, TypeScript, Tailwind CSS, `@moongatracker/shared-types`.

---

## Файловая карта

| Действие | Файл                                           | Ответственность                                                                      |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| CREATE   | `apps/web/src/lib/use-card-filter.ts`          | `FilterState` тип, `filterColumns` чистая функция, `useCardFilter` хук               |
| CREATE   | `apps/web/src/lib/use-card-filter.spec.ts`     | unit-тесты для `filterColumns`                                                       |
| CREATE   | `apps/web/src/components/board/filter-bar.tsx` | UI: поиск + лейбл-чипы + кнопка сброса                                               |
| MODIFY   | `apps/web/src/components/board/card-tile.tsx`  | добавить `disabled?: boolean` → `useSortable({ disabled })`                          |
| MODIFY   | `apps/web/src/components/board/column.tsx`     | добавить `disabled?: boolean` → `useDroppable({ disabled })` + передать в `CardTile` |
| MODIFY   | `apps/web/src/components/board/board.tsx`      | state фильтра, `useCardFilter`, `FilterBar`, `disabled` для колонок                  |

---

## Task 1: Хук `useCardFilter` + типы

**Files:**

- Create: `apps/web/src/lib/use-card-filter.ts`

- [ ] **Шаг 1: Создать файл с типом, чистой функцией и хуком**

```ts
// apps/web/src/lib/use-card-filter.ts
import { useMemo } from 'react';
import { ColumnDto } from '@moongatracker/shared-types';

export type FilterState = { search: string; labelIds: Set<string> };

export function filterColumns(
  columns: ColumnDto[],
  filter: FilterState,
): ColumnDto[] {
  const trimmed = filter.search.trim().toLowerCase();
  if (!trimmed && filter.labelIds.size === 0) return columns;

  return columns.map((col) => ({
    ...col,
    cards: col.cards.filter((card) => {
      const text = `${card.title} ${card.body ?? ''}`.toLowerCase();
      const matchesSearch = !trimmed || text.includes(trimmed);
      const matchesLabels =
        filter.labelIds.size === 0 ||
        card.labels.some((l) => filter.labelIds.has(l.id));
      return matchesSearch && matchesLabels;
    }),
  }));
}

export function useCardFilter(
  columns: ColumnDto[],
  filter: FilterState,
): ColumnDto[] {
  return useMemo(() => filterColumns(columns, filter), [columns, filter]);
}
```

- [ ] **Шаг 2: Написать тесты для `filterColumns`**

```ts
// apps/web/src/lib/use-card-filter.spec.ts
import { describe, it, expect } from 'vitest';
import { ColumnDto, CardDto } from '@moongatracker/shared-types';
import { filterColumns, FilterState } from './use-card-filter';

const card = (
  id: string,
  title: string,
  body?: string,
  labelIds: string[] = [],
): CardDto => ({
  id,
  columnKey: 'idea',
  title,
  body: body ?? null,
  priority: 0,
  order: 0,
  labels: labelIds.map((lid) => ({ id: lid, name: lid, color: '#000' })),
});

const col = (key: string, cards: CardDto[]): ColumnDto => ({
  id: `col-${key}`,
  key: key as ColumnDto['key'],
  title: key,
  order: 0,
  cards,
});

const empty: FilterState = { search: '', labelIds: new Set() };

describe('filterColumns', () => {
  it('returns same reference when filter is empty', () => {
    const cols = [col('idea', [card('1', 'Hello')])];
    expect(filterColumns(cols, empty)).toBe(cols);
  });

  it('filters by title substring (case-insensitive)', () => {
    const cols = [col('idea', [card('1', 'Buy milk'), card('2', 'Fix bug')])];
    const result = filterColumns(cols, { search: 'MiLk', labelIds: new Set() });
    expect(result[0].cards).toHaveLength(1);
    expect(result[0].cards[0].id).toBe('1');
  });

  it('filters by body text', () => {
    const cols = [
      col('idea', [
        card('1', 'Task', 'do the thing'),
        card('2', 'Other', 'nothing'),
      ]),
    ];
    const result = filterColumns(cols, {
      search: 'the thing',
      labelIds: new Set(),
    });
    expect(result[0].cards[0].id).toBe('1');
    expect(result[0].cards).toHaveLength(1);
  });

  it('keeps columns with zero cards after filter', () => {
    const cols = [
      col('idea', [card('1', 'Foo')]),
      col('backlog', [card('2', 'Bar')]),
    ];
    const result = filterColumns(cols, { search: 'Foo', labelIds: new Set() });
    expect(result).toHaveLength(2);
    expect(result[1].cards).toHaveLength(0);
  });

  it('filters by label (OR logic — any matching label)', () => {
    const cols = [
      col('idea', [
        card('1', 'Alpha', '', ['bug']),
        card('2', 'Beta', '', ['feature']),
        card('3', 'Gamma', '', []),
      ]),
    ];
    const result = filterColumns(cols, {
      search: '',
      labelIds: new Set(['bug']),
    });
    expect(result[0].cards.map((c) => c.id)).toEqual(['1']);
  });

  it('combines search and label filter (both must match)', () => {
    const cols = [
      col('idea', [
        card('1', 'bug fix', '', ['bug']),
        card('2', 'bug report', '', ['feature']),
        card('3', 'feature work', '', ['bug']),
      ]),
    ];
    const result = filterColumns(cols, {
      search: 'bug',
      labelIds: new Set(['bug']),
    });
    expect(result[0].cards.map((c) => c.id)).toEqual(['1']);
  });

  it('shows all cards when labelIds is empty (no label filter)', () => {
    const cols = [
      col('idea', [card('1', 'X', '', ['a']), card('2', 'Y', '', ['b'])]),
    ];
    const result = filterColumns(cols, { search: '', labelIds: new Set() });
    expect(result[0].cards).toHaveLength(2);
  });
});
```

- [ ] **Шаг 3: Запустить тесты — убедиться что падают**

```bash
npx nx test web
```

Ожидаем: FAIL — `filterColumns is not defined` (файл ещё не сохранён корректно / тесты указывают на экспорты которых нет).

- [ ] **Шаг 4: Убедиться что тесты проходят**

```bash
npx nx test web
```

Ожидаем: все 7 тестов PASS.

- [ ] **Шаг 5: Коммит**

```bash
git -C apps/web/../.. add apps/web/src/lib/use-card-filter.ts apps/web/src/lib/use-card-filter.spec.ts
git -C /Users/dmitrijordin/checker_pro/moongatracker commit -m "feat(web): add filterColumns logic and useCardFilter hook"
```

---

## Task 2: Компонент `FilterBar`

**Files:**

- Create: `apps/web/src/components/board/filter-bar.tsx`

- [ ] **Шаг 1: Создать компонент**

```tsx
// apps/web/src/components/board/filter-bar.tsx
import { LabelDto } from '@moongatracker/shared-types';
import { RiSearchLine, RiCloseLine } from '@remixicon/react';
import { FilterState } from '../../lib/use-card-filter';

interface FilterBarProps {
  labels: LabelDto[];
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

export function FilterBar({ labels, filter, onChange }: FilterBarProps) {
  const isActive = filter.search !== '' || filter.labelIds.size > 0;

  function toggleLabel(id: string) {
    const next = new Set(filter.labelIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange({ ...filter, labelIds: next });
  }

  function clear() {
    onChange({ search: '', labelIds: new Set() });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <RiSearchLine className="pointer-events-none absolute left-2 size-3 text-muted-foreground/40" />
        <input
          type="search"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder="Поиск..."
          className="h-6 w-32 border border-border bg-transparent pl-6 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:border-foreground/30 focus:outline-none"
        />
      </div>

      {labels.map((label) => {
        const active = filter.labelIds.has(label.id);
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => toggleLabel(label.id)}
            className="flex h-5 items-center border px-1.5 text-[10px] transition-colors"
            style={
              active
                ? {
                    backgroundColor: label.color,
                    borderColor: label.color,
                    color: '#fff',
                  }
                : {
                    borderColor: 'var(--border)',
                    color: 'var(--muted-foreground)',
                  }
            }
          >
            {label.name}
          </button>
        );
      })}

      {isActive && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <RiCloseLine className="size-3" />
          Сбросить
        </button>
      )}
    </div>
  );
}
```

- [ ] **Шаг 2: Запустить тесты — убедиться, что ничего не сломалось**

```bash
npx nx test web
```

Ожидаем: все предыдущие тесты PASS (Task 1). Новых тестов пока нет.

- [ ] **Шаг 3: Коммит**

```bash
git -C /Users/dmitrijordin/checker_pro/moongatracker add apps/web/src/components/board/filter-bar.tsx
git -C /Users/dmitrijordin/checker_pro/moongatracker commit -m "feat(web): add FilterBar component"
```

---

## Task 3: Добавить `disabled` в `CardTile`

**Files:**

- Modify: `apps/web/src/components/board/card-tile.tsx`

- [ ] **Шаг 1: Добавить `disabled` prop**

Изменить сигнатуру компонента и передать в `useSortable`:

```tsx
// apps/web/src/components/board/card-tile.tsx
import { CardDto } from '@moongatracker/shared-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RiDraggable } from '@remixicon/react';
import { LabelChip } from './label-chip';

export function CardTile({
  card,
  disabled,
  onClick,
}: {
  card: CardDto;
  disabled?: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(disabled ? {} : listeners)}
      onClick={onClick}
      className={
        'group relative touch-none border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/30 ' +
        (disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing')
      }
    >
      <span className="absolute inset-y-0 left-0 w-[2px] bg-transparent transition-colors group-hover:bg-primary" />

      {card.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <LabelChip key={l.id} name={l.name} color={l.color} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <p className="flex-1 text-[13px] font-medium leading-snug text-card-foreground">
          {card.title}
        </p>
        {!disabled && (
          <RiDraggable
            aria-hidden
            className="mt-px size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>

      {card.body && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {card.body}
        </p>
      )}
    </article>
  );
}
```

- [ ] **Шаг 2: Тесты проходят**

```bash
npx nx test web
```

Ожидаем: все PASS.

- [ ] **Шаг 3: Коммит**

```bash
git -C /Users/dmitrijordin/checker_pro/moongatracker add apps/web/src/components/board/card-tile.tsx
git -C /Users/dmitrijordin/checker_pro/moongatracker commit -m "feat(web): add disabled prop to CardTile"
```

---

## Task 4: Добавить `disabled` в `Column`

**Files:**

- Modify: `apps/web/src/components/board/column.tsx`

- [ ] **Шаг 1: Добавить `disabled` prop**

```tsx
// apps/web/src/components/board/column.tsx
import { CardDto, ColumnDto } from '@moongatracker/shared-types';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RiCheckboxBlankCircleLine } from '@remixicon/react';
import { CardTile } from './card-tile';
import { CardComposer } from './card-composer';

export function Column({
  column,
  index,
  boardId,
  disabled,
  onChanged,
  onSelectCard,
}: {
  column: ColumnDto;
  index: number;
  boardId: string;
  disabled?: boolean;
  onChanged: () => void;
  onSelectCard: (card: CardDto) => void;
}) {
  const count = column.cards.length;
  const { setNodeRef, isOver } = useDroppable({ id: column.key, disabled });

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
          boardId={boardId}
          columnKey={column.key}
          onAdded={onChanged}
        />
      </div>
    </section>
  );
}
```

- [ ] **Шаг 2: Тесты**

```bash
npx nx test web
```

Ожидаем: все PASS.

- [ ] **Шаг 3: Коммит**

```bash
git -C /Users/dmitrijordin/checker_pro/moongatracker add apps/web/src/components/board/column.tsx
git -C /Users/dmitrijordin/checker_pro/moongatracker commit -m "feat(web): add disabled prop to Column"
```

---

## Task 5: Подключить всё в `board.tsx`

**Files:**

- Modify: `apps/web/src/components/board/board.tsx`

- [ ] **Шаг 1: Обновить `board.tsx`**

Добавить импорты, state фильтра, dedupe-хелпер, `useCardFilter`, `FilterBar` в хедер:

```tsx
// apps/web/src/components/board/board.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  BoardDto,
  CardDto,
  ColumnDto,
  LabelDto,
} from '@moongatracker/shared-types';
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
import { RiLogoutBoxRLine, RiTBoxLine } from '@remixicon/react';
import { VIEWS, ViewId } from '../../lib/views';
import { FilterState, useCardFilter } from '../../lib/use-card-filter';
import { updateCard } from '../../api/cards';
import { logout } from '../../api/auth';
import { Column } from './column';
import { ViewSwitch } from './view-switch';
import { CardDialog } from './card-dialog';
import { FilterBar } from './filter-bar';

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

function dedupeLabels(columns: ColumnDto[]): LabelDto[] {
  const seen = new Map<string, LabelDto>();
  columns.forEach((col) =>
    col.cards.forEach((card) =>
      card.labels.forEach((l) => {
        if (!seen.has(l.id)) seen.set(l.id, l);
      }),
    ),
  );
  return Array.from(seen.values());
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
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    labelIds: new Set(),
  });

  useEffect(() => setColumns(board.columns), [board]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const def = VIEWS.find((v) => v.id === view) ?? VIEWS[0];
  const visible = def.columns
    ? columns.filter((c) => def.columns!.includes(c.key))
    : columns;

  const filterActive = filter.search !== '' || filter.labelIds.size > 0;
  const allLabels = useMemo(() => dedupeLabels(board.columns), [board.columns]);
  const filteredVisible = useCardFilter(visible, filter);

  const displayTotal = filterActive
    ? filteredVisible.reduce((n, c) => n + c.cards.length, 0)
    : columns.reduce((n, c) => n + c.cards.length, 0);

  async function persist(next: ColumnDto[]) {
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
            {displayTotal} задач
          </span>
          <FilterBar labels={allLabels} filter={filter} onChange={setFilter} />
          <ViewSwitch value={view} onChange={setView} />
          <button
            type="button"
            onClick={() => logout()}
            title="Выйти"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <RiLogoutBoxRLine className="size-4" />
          </button>
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
          {filteredVisible.map((column, i) => (
            <Column
              key={column.id}
              column={column}
              index={i}
              boardId={board.id}
              disabled={filterActive}
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
          boardId={board.id}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
```

- [ ] **Шаг 2: Запустить тесты**

```bash
npx nx test web
```

Ожидаем: все PASS.

- [ ] **Шаг 3: Typecheck**

```bash
npx nx run @org/web:typecheck 2>/dev/null || npx tsc --noEmit -p apps/web/tsconfig.json
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 4: Коммит**

```bash
git -C /Users/dmitrijordin/checker_pro/moongatracker add apps/web/src/components/board/board.tsx
git -C /Users/dmitrijordin/checker_pro/moongatracker commit -m "feat(web): wire FilterBar and useCardFilter into Board (Phase 3)"
```

---

## Task 6: Ручная проверка в браузере

- [ ] **Шаг 1: Запустить API и web**

Терминал 1:

```bash
cd /Users/dmitrijordin/checker_pro/moongatracker && npx nx serve api
```

Терминал 2:

```bash
cd /Users/dmitrijordin/checker_pro/moongatracker && npx nx serve web
```

Открыть `http://localhost:4200`.

- [ ] **Шаг 2: Проверить поиск**

1. Ввести часть заголовка карточки → видны только совпадающие карточки во всех колонках.
2. Ввести часть текста из `body` → та же карточка находится.
3. Ввести несуществующий текст → все колонки пустые (с плейсхолдером «пусто»).

- [ ] **Шаг 3: Проверить фильтр по лейблу**

1. Создать карточку с лейблом (через CardDialog).
2. Кликнуть на чип лейбла в FilterBar → видна только карточка с этим лейблом.
3. Кликнуть ещё раз → чип деактивируется, все карточки видны.

- [ ] **Шаг 4: Проверить блокировку DnD**

1. При активном поиске попробовать потащить карточку → drag не начинается.
2. Сбросить фильтр → DnD работает как раньше.

- [ ] **Шаг 5: Проверить ViewSwitch + фильтр**

Переключить вид на «Идеи», одновременно ввести текст в поиск → показываются только карточки из колонок «idea/triage» которые совпадают с текстом.

- [ ] **Шаг 6: Счётчик задач**

При активном фильтре счётчик показывает количество отфильтрованных карточек. При сбросе — общее количество.

---

## Чеклист само-проверки

Спека требования → задачи:

- ✅ Поиск по title + body → Task 1 (`filterColumns`)
- ✅ Фильтр по лейблам, OR-логика → Task 1 (`filterColumns`)
- ✅ Колонки с 0 карт остаются → Task 1 (тест "keeps columns with zero cards")
- ✅ DnD блокируется при фильтре → Task 3, 4, 5
- ✅ Кнопка «Сбросить» → Task 2 (`FilterBar`)
- ✅ Счётчик задач обновляется → Task 5 (`displayTotal`)
- ✅ ViewSwitch + фильтр ортогональны → Task 5 (фильтр применяется к `visible`, а не `columns`)
- ✅ Нет изменений в API/БД → подтверждено по всем задачам
