# Phase 3: Поиск и фильтры — спецификация

**Дата:** 2026-06-30  
**Статус:** утверждено

---

## Контекст

Phase 0–2 завершены: канбан-доска с DnD, CRUD карточек, лейблы, комментарии, агент-слой через MCP.  
Phase 3 добавляет возможность быстро находить карточки на доске без смены инструмента.

---

## Scope

- Поиск по тексту (title + body карточки, case-insensitive)
- Фильтр по лейблам (мульти-выбор, OR-логика: карточка показывается если есть хотя бы один из выбранных лейблов)
- DnD заблокирован при активном фильтре
- Всё клиентское — никаких изменений в API и БД
- Assignee-фильтр и фильтр по колонке — вне scope

---

## Архитектура

Все карточки уже загружены через `GET /boards`. Фильтрация — чисто клиентская, derived state поверх уже имеющихся данных.

Лейблы для filter bar берём из `board.columns → cards → labels` (дедупликация по `id`). Дополнительный API-запрос не нужен: карточки уже несут `labels: LabelDto[]`.

```
FilterState = { search: string; labelIds: Set<string> }

board.columns
  → [useCardFilter(columns, filter)] → filteredVisible
  → Column (disabled = filterActive)
    → CardTile (disabled = filterActive)
```

---

## Компоненты

### 1. `apps/web/src/lib/use-card-filter.ts` (новый)

Хук, возвращает новый массив колонок с отфильтрованными картами.

```ts
export type FilterState = { search: string; labelIds: Set<string> };

export function useCardFilter(
  columns: ColumnDto[],
  filter: FilterState,
): ColumnDto[];
```

- Если `search === ''` и `labelIds.size === 0` → возвращает `columns` без изменений (референс тот же, ре-рендер не нужен).
- Текст: `(card.title + ' ' + (card.body ?? '')).toLowerCase().includes(search.trim().toLowerCase())`
- Лейблы: `labelIds.size === 0 || card.labels.some(l => labelIds.has(l.id))`
- Колонки с 0 карт после фильтрации **остаются** в выводе (структура канбана сохраняется).

### 2. `apps/web/src/components/board/filter-bar.tsx` (новый)

```ts
interface FilterBarProps {
  labels: LabelDto[];
  filter: FilterState;
  onChange: (f: FilterState) => void;
}
```

UI (всё в одной строке, рядом с ViewSwitch):

- `<input type="search">` — controlled, меняет `filter.search`
- Label-чипы — клик переключает `labelId` в Set; активный чип визуально выделен (цвет фона лейбла)
- Кнопка «Сбросить» появляется когда `search !== '' || labelIds.size > 0`

Стиль: следует существующему `text-[11px]` / `text-muted-foreground` паттерну из хедера.

### 3. `apps/web/src/components/board/card-tile.tsx` (изменение)

Добавить `disabled?: boolean` → передать в `useSortable({ id, disabled })`.

### 4. `apps/web/src/components/board/column.tsx` (изменение)

Добавить `disabled?: boolean`:

- передать в `useDroppable({ id: column.key, disabled })`
- передать в каждый `<CardTile disabled={disabled}>`

### 5. `apps/web/src/components/board/board.tsx` (изменение)

Добавить в local state:

```ts
const [filter, setFilter] = useState<FilterState>({
  search: '',
  labelIds: new Set(),
});
```

Вычислить:

```ts
const filterActive = filter.search !== '' || filter.labelIds.size > 0;
const allLabels = useMemo(() => dedupeLabels(board.columns), [board]);
const filteredVisible = useCardFilter(visible, filter);
```

Заменить `visible` на `filteredVisible` в рендере колонок.  
Передать `disabled={filterActive}` каждому `<Column>`.  
Отрендерить `<FilterBar labels={allLabels} filter={filter} onChange={setFilter} />` в хедере рядом с `<ViewSwitch>`.

Счётчик «N задач» — показывать `filteredVisible.reduce(...)` когда `filterActive`, иначе `total`.

---

## Взаимодействие с DnD

- `useSortable({ disabled: true })` и `useDroppable({ disabled: true })` из dnd-kit отключают drag-события на уровне каждого элемента.
- `DndContext` остаётся в дереве — нет нужды его условно рендерить.
- При `filterActive` карточки визуально остаются, но не тащатся.

---

## Что НЕ меняем

- API (`GET /boards`, модели, DTO) — без изменений
- Prisma-схема — без изменений
- ViewSwitch — без изменений, работает поверх уже отфильтрованных колонок
- Логика Socket.IO / React Query — без изменений

---

## Проверка (verification)

1. `npx nx serve web` + `npx nx serve api` — открыть доску
2. Ввести часть названия карточки → видны только совпадающие карточки
3. Выбрать лейбл → видны карточки с этим лейблом (из любых колонок)
4. Комбинация: текст + лейбл — показывает пересечение
5. При активном фильтре: попытка потащить карточку — drag не начинается
6. Кнопка «Сбросить» → все карточки снова видны
7. ViewSwitch + фильтр работают одновременно (view скрывает колонки, фильтр скрывает карты внутри видимых)
