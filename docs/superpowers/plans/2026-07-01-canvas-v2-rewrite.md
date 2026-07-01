# Canvas v2 — полный переписыв (React Flow-native)

> Заменяет v1 (`2026-06-30-project-canvas-*`). v1 работает, но UX неудобный: рефетч на каждое
> действие (дёрганье), кнопки на карточках, текст вылезал, кривые стрелки, нельзя менять размер.
> Цель v2 — сделать «как в примерах React Flow», удобно, с плавностью/undo-redo/copy-paste/тулбаром
> по выделению/авто-раскладкой. Доку RF v12 читаем через **Context7** (`/websites/reactflow_dev`).

## Context

Пользователь: снести **всё** (вкл. бэкенд) и пересобрать. Приоритеты «удобства»:
1. плавность без прыжков, 2. тулбар по выделению, 3. undo/redo + copy-paste, 4. авто-раскладка + рёбра,
5. «просто как в примере библиотеки под наши задачи».

Наши задачи, которые остаются требованием (не из RF-примеров):
- **markdown-ноды**; **связь ноды с задачей канбана** (создать/привязать/отвязать, бейдж со статусом,
  переход в карточку `/boards/:boardId/cards/:cardId`);
- **read-only MCP** `get_canvas` для агента;
- **совместное редактирование** — оставляем soft-lock (один редактор за раз, авто-вход/выход по
  простою, перехват по TTL). С JSON-документом это даже правильнее: full-save под локом = нет гонок
  «last write clobbers».

## Ключевое решение архитектуры: JSON-документ холста на проект

Уходим от нормализованных `CanvasNode`/`CanvasEdge` к **одному документу на проект** — так устроен
канонический пример RF `save-and-restore` (`toObject()` → JSON, restore через `setNodes/setEdges/
setViewport`). Это:
- делает фронт плавным (локальный RF-state, БД трогаем debounce'ом целиком);
- упрощает бэкенд до GET/PUT + пары операций;
- убирает конфликты записи (под локом пишет один).

Цена (осознанно): нет FK/каскадов на связь с карточкой — целостность связи резолвим на чтении
(если карточка удалена, бейдж не показываем). Приемлемо.

### Prisma
Удалить модели `CanvasNode`, `CanvasEdge` и их связи на `Project`/`Card`. Добавить:
```prisma
model Canvas {
  projectId String   @id
  data      Json     @default("{}")   // { nodes: RFNode[], edges: RFEdge[], viewport?: {x,y,zoom} }
  updatedAt DateTime @updatedAt
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```
На `Card` — обратной связи больше нет (cardId живёт внутри `node.data`). Миграция: `DROP TABLE
"CanvasEdge","CanvasNode"` + `CREATE TABLE "Canvas"`. Данные v1 — тестовые, теряем осознанно.
Применяем как в прошлый раз: `prisma db execute` + `migrate resolve --applied` (drift в dev-БД).

## Что удаляем (v1)

- Backend: `apps/api/src/canvas/**` (service/controller/module/dto/spec), регистрация в `app.module.ts`;
  модели/связи canvas в `prisma/schema.prisma`.
- shared-types: `libs/shared-types/src/lib/canvas.ts` (перепишем).
- MCP: `apps/mcp/src/tools/get-canvas.ts` (перепишем под новый GET).
- Frontend: `apps/web/src/pages/canvas.tsx`, `apps/web/src/components/canvas/markdown-node.tsx`,
  `apps/web/src/api/canvas.ts` (перепишем). `apps/web/src/api/socket.ts` `useCanvasSocket` — оставляем
  (lock-протокол в gateway не трогаем).
- НЕ трогаем: `apps/api/src/events/events.gateway.ts` (soft-lock generic, уже готов), роут в `app.tsx`,
  ссылку в `sidebar.tsx`.

## Backend v2 (`apps/api/src/canvas/`)

Модель доступа как в v1: чтение — участник-человек **или** агент-токен проекта; запись — только
человек (`assertMembership`, агент → 403).

`CanvasService` (Prisma `canvas` + `card`/`board`/`column`):
- `getCanvas(projectId, user)` → `{ nodes, edges, viewport }`. Читает `Canvas.data`; для нод с
  `data.cardId` **батч-резолвит** актуальные карточки (`card.findMany({ id in [...] })` + их колонки)
  и вставляет свежий `data.card = { id, boardId, title, columnTitle, priority }`; если карточки нет —
  `data.card = null` (и чистим повисший `cardId`). Если документа нет — вернуть **seed** (2 демо-ноды
  + ребро), не сохраняя (создастся при первом PUT).
- `saveCanvas(projectId, user, { nodes, edges, viewport })` — `assertWrite`; `upsert` `Canvas.data`.
  Ноды сохраняем **без** резолв-поля `data.card` (храним только `cardId`), viewport — как есть.
- `createTaskFromNode(projectId, nodeId, boardId, user)` — `assertWrite`; берёт заголовок из текста
  ноды (первая строка); создаёт `Card` в первой колонке доски (min `order`) **с обязательным `number`
  = max(number по доске)+1 в транзакции** (грабли v1!); возвращает `{ cardId, card }`. Фронт
  проставит `node.data.cardId` локально и сохранит.
- `linkTask`/`unlinkTask` можно оставить чисто клиентскими (правка `node.data.cardId` + autosave);
  но для валидации «карточка того же проекта» добавить лёгкий `validateCard(projectId, cardId)` →
  card summary. (Проще: фронт зовёт GET списка карточек проекта для пикера, а сервер на GET-canvas
  всё равно резолвит — так что link/unlink = локальная правка + save. Оставляем без спец-эндпоинтов.)

REST:
- `GET  /projects/:projectId/canvas` → `{ nodes, edges, viewport }`
- `PUT  /projects/:projectId/canvas` `{ nodes, edges, viewport }` → сохранить
- `POST /projects/:projectId/canvas/nodes/:nodeId/create-task` `{ boardId }` → `{ cardId, card }`

DTO — `class-validator`; `nodes/edges` валидируем как массивы объектов (лёгкая схема: id/position/…),
без жёсткой типизации внутренностей RF (храним как есть).

### shared-types
`libs/shared-types/src/lib/canvas.ts`: `CanvasNodeData { text, color?, cardId?, card? }`,
`LinkedCardDto`, `CanvasDoc { nodes, edges, viewport? }`, узлы/рёбра — совместимые с RF (`id`,
`type`, `position`, `data`, `width?`, `height?`; edge `id/source/target/data`).

### MCP
`get-canvas.ts` — как v1, дергает `GET .../canvas`, отдаёт `CanvasDoc` (ноды с резолвнутыми карточками).

## Frontend v2 (`apps/web`)

Зависимости: `@xyflow/react` (есть) + `@dagrejs/dagre` (авто-раскладка).

Состояние — **controlled** (`useNodesState`/`useEdgesState` + `applyNodeChanges/applyEdgeChanges`),
без рефетча на действие. Персистентность — **debounced autosave** (`useDebouncedCallback`, ~800мс):
на любое изменение `nodes/edges/viewport`, если держим лок, `PUT` целиком (`toObject()`), как в
RF save-restore. Первичная загрузка — `GET` → `setNodes/setEdges/setViewport`.

Файлы:
- `pages/canvas.tsx` — обёртка `ReactFlowProvider`, композиция.
- `components/canvas/flow-canvas.tsx` — сам `<ReactFlow>` со всеми фичами (ниже).
- `components/canvas/markdown-node.tsx` — нода: рендер markdown + `NodeResizer` (по selected) +
  `NodeToolbar` (по selected) с действиями (править текст, цвет — **убран**? по фидбеку да, убираем;
  оставляем: править текст, задача создать/привязать/отвязать, удалить). Бейдж карточки → навигация.
- `components/canvas/markdown-edge.tsx` — кастомное ребро: `BaseEdge`+`getBezierPath` +
  `EdgeLabelRenderer` (подпись, кнопка ✕ удалить через `deleteElements`).
- `hooks/use-undo-redo.ts` — снапшот-стек (past/future), Ctrl+Z / Ctrl+Shift+Z (паттерн RF undo-redo).
- `lib/canvas-layout.ts` — dagre auto-layout (кнопка «Разложить» в `Panel`).
- `api/canvas.ts` — `fetchCanvas`, `saveCanvas`, `createTaskFromNode`.

Удобства (маппинг на RF API, всё из доки, прочитанной через Context7):
- **Плавность** — controlled state + debounced PUT; drag/resize/connect меняют локальный стейт мгновенно.
- **Тулбар по выделению** — `NodeToolbar` (виден когда нода selected).
- **Undo/redo** — `useUndoRedo`; снапшот перед мутациями; хоткеи.
- **Copy/paste + мультивыбор** — RF selection (`selectionOnDrag`, `multiSelectionKeyCode`), Ctrl+C/V
  (клонируем выбранные ноды со сдвигом), удаление — `deleteKeyCode` + `onNodesDelete/onEdgesDelete`.
- **Создание ноды** — дабл-клик по полотну (screenToFlowPosition) **и** «протяни ребро в пустоту»
  (`onConnectEnd` создаёт ноду и связывает) + кнопка `+ Нода` в `Panel`.
- **Snap-to-grid** — `snapToGrid` + `snapGrid={[16,16]}`.
- **Ресайз/overflow** — `NodeResizer` + контейнер `overflow-hidden`, тело со скроллом (стрелки не
  съезжают — размер ноды == видимому боксу).
- **Рёбра** — `defaultEdgeOptions` (bezier), кастомный edge с подписью/удалением.
- **Авто-раскладка** — dagre, кнопка в `Panel`.
- **Лок (совместность)** — `useCanvasSocket`: авто-lock при первом действии, heartbeat, release по
  простою (30с)/уходу; чужой лок → read-only (`nodesDraggable/Connectable/elementsSelectable=false`)
  + баннер «{имя} редактирует» в цвете участника; перехват по TTL. Autosave — только под локом.

## Verification

1. Prisma: `npx prisma generate`; миграция (drop+create) через `db execute` + `migrate resolve`.
2. api: `npx nx test api` (юниты нового `CanvasService`: get резолвит карточки; create-task ставит
   `number` и первую колонку; save upsert; агент-запись → 403). `npx nx build api`.
3. shared-types/mcp/web: `npx nx build`.
4. Ручной E2E (Playwright, dev :4200): загрузка+seed; дабл-клик/`+Нода`/connect-to-empty создают ноду
   плавно (без «прыжка»); ресайз; тулбар по выделению; правка текста; создать задачу (→ карточка в
   первой колонке, бейдж, переход); undo/redo; copy/paste; авто-раскладка; лок в двух вкладках; после
   перезагрузки состояние (позиции/viewport) сохранено.

## Открытые решения (по фидбеку пользователя уже закрыты)
- Цвет ноды — **убрать** (пользователь просил). Поле `color` в данных можно оставить, UI выбора — нет.
- Хранение — JSON-документ (см. выше).
- Совместность — оставляем soft-lock.
