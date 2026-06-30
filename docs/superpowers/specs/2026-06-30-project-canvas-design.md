# Дизайн: Canvas (обсидиан-холст) на проект

## Context

У проекта уже есть две «общие памяти»: канбан (`Board`/`Card`) и вики (`WikiSection`/`WikiPage`,
markdown). Нужен третий, пространственный способ думать — **холст в духе Obsidian Canvas**:
бесконечное полотно, на которое кидаешь свободные markdown-карточки (ноды) и **руками тянешь
стрелки** между ними. Это не авто-граф из `[[ссылок]]`, а ручная схема/майндмэп.

Ключевая интеграция с канбаном: **любую ноду можно превратить в задачу или привязать к
существующей**. Так холст соединяет наброски идей и реальные задачи на одном полотне.

Фича делается тем же паттерном, что вики (модуль api + shared-types DTO + REST под
`projects/:projectId/...` + страница web + React Query), чтобы лечь в существующие конвенции.

### Зафиксированные решения (из брейншторма)
- «Обсидиан-доска» = **Canvas** (полотно + стрелки вручную), не граф из ссылок.
- **Один холст на проект** (как вики), роут `/projects/:projectId/canvas`. Отдельной сущности
  `Canvas` нет — ноды/рёбра ссылаются на `projectId` напрямую.
- Нода — **свободный markdown** + позиция/размер (+ опц. цвет-акцент). Эмбедов вики/карточек
  как типов нод нет.
- У ноды **опциональная связь 1:1 с `Card`**: «создать задачу» или «привязать существующую».
- «Создать задачу» → диалог спрашивает **только доску** → карточка в **первую колонку** этой доски.
- «Привязать» → выбор из **всех карточек проекта**.
- Удаление: удаляю ноду → карточка цела; удаляю карточку → нода **отвязывается** (`cardId=null`)
  и становится обычной markdown-нодой. Пометку «задача была удалена» в v1 **не показываем**:
  `onDelete: SetNull` теряет факт былой связи, а отдельный флаг — лишнее состояние (отложено).
- **Realtime — да**, через существующий механизм (см. ниже). **MCP/агент — нет** в v1.
- Рендер — **React Flow** (`@xyflow/react`).
- Seed — **да**: при первом открытии засевается демо (несколько нод + стрелка), идемпотентно.

## Модель данных (Prisma)

`prisma/schema.prisma` — две новых модели; ноды/рёбра висят на проекте напрямую.

```prisma
model CanvasNode {
  id        String   @id @default(cuid())
  projectId String
  text      String   @default("")   // markdown
  x         Float
  y         Float
  width     Float    @default(240)
  height    Float    @default(120)
  color     String?                  // акцент ноды (опц.)
  cardId    String?  @unique         // 1:1 связь с Card; SetNull при удалении карточки
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  card      Card?    @relation(fields: [cardId], references: [id], onDelete: SetNull)
  outEdges  CanvasEdge[] @relation("CanvasEdgeSource")
  inEdges   CanvasEdge[] @relation("CanvasEdgeTarget")
}

model CanvasEdge {
  id           String   @id @default(cuid())
  projectId    String
  sourceNodeId String
  targetNodeId String
  label        String?
  createdAt    DateTime @default(now())
  project Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  source  CanvasNode @relation("CanvasEdgeSource", fields: [sourceNodeId], references: [id], onDelete: Cascade)
  target  CanvasNode @relation("CanvasEdgeTarget", fields: [targetNodeId], references: [id], onDelete: Cascade)
}
```

- На `Card` — обратная связь `canvasNode CanvasNode?`. На `Project` — `canvasNodes CanvasNode[]`,
  `canvasEdges CanvasEdge[]`.
- `cardId @unique` обеспечивает связь **1:1** (карточку можно повесить максимум на одну ноду).
- `onDelete: SetNull` на `card` → удаление карточки оставляет ноду (отвязанной).
- Рёбра каскадно удаляются при удалении ноды-конца.
- **Миграция** новая. Учесть, что в dev-БД сейчас есть drift по предыдущим миграциям (см. фичу
  цветов участников) — применять после разрешения drift.

## shared-types (`libs/shared-types`)

Новый `lib/canvas.ts` + barrel `index.ts`:
- `CanvasNodeDto { id, projectId, text, x, y, width, height, color, cardId, card?: LinkedCardDto, createdAt, updatedAt }`
- `LinkedCardDto { id, boardId, title, columnTitle, priority }` — минимум для бейджа/перехода;
  `null`/отсутствует, если не привязана.
- `CanvasEdgeDto { id, projectId, sourceNodeId, targetNodeId, label }`
- `CanvasDto { nodes: CanvasNodeDto[]; edges: CanvasEdgeDto[] }`
- Input-типы: `CreateCanvasNodeInput`, `UpdateCanvasNodeInput`, `CreateCanvasEdgeInput`,
  `UpdateCanvasEdgeInput`, `CreateTaskFromNodeInput { boardId }`, `LinkTaskInput { cardId }`.

## API (`apps/api/src/canvas/`)

Модуль/контроллер/сервис/dto по образцу `apps/api/src/wiki/`. Доступ ко всему —
`assertMembership(prisma, user.sub, projectId)` (человек-only; **без** agent-ветки, в отличие от
вики — у холста v1 нет агент-доступа).

Роуты:
- `GET  /projects/:projectId/canvas` → `CanvasDto`
- `POST /projects/:projectId/canvas/seed` → `CanvasDto` (идемпотентно: только если нод нет)
- `POST /projects/:projectId/canvas/nodes` (`CreateCanvasNodeInput`) → `CanvasNodeDto`
- `PATCH /canvas/nodes/:nodeId` (`UpdateCanvasNodeInput`: text/x/y/width/height/color) → `CanvasNodeDto`
- `DELETE /canvas/nodes/:nodeId` (204)
- `POST /projects/:projectId/canvas/edges` (`CreateCanvasEdgeInput`) → `CanvasEdgeDto`
- `PATCH /canvas/edges/:edgeId` (label) → `CanvasEdgeDto`
- `DELETE /canvas/edges/:edgeId` (204)
- `POST /canvas/nodes/:nodeId/create-task` (`{ boardId }`) → создаёт `Card` в первой колонке
  доски (колонка с min `order`), ставит `node.cardId`, возвращает `CanvasNodeDto` (с `card`).
- `POST /canvas/nodes/:nodeId/link-task` (`{ cardId }`) → привязать; валидация: карточка
  принадлежит тому же проекту и ещё не привязана (иначе 400/409).
- `DELETE /canvas/nodes/:nodeId/task` → отвязать (`cardId=null`).

Сервис-хелперы: резолв `projectId` по `nodeId`/`edgeId` (как `sectionProjectId` в вики);
сбор `LinkedCardDto` (карточка → её колонка/доска). «Первая колонка» = `Column` с минимальным
`order` у доски; если у доски нет колонок — 400.

DTO — `class-validator`, как в вики (hex для `color`: `@Matches(/^#[0-9a-fA-F]{6}$/)`).

## Realtime

**Бэкенд менять не нужно.** `BoardEventsInterceptor` зарегистрирован глобально
(`APP_INTERCEPTOR` в `EventsModule`) и эмитит общий `board:changed` после любой мутации
(не-GET, кроме `/auth`) — наши canvas-мутации тоже попадают под него.

Web: добавить `useCanvasSocket(projectId, queryClient)` по образцу `useBoardSocket`
(`apps/web/src/api/socket.ts`): на `board:changed` инвалидировать `['canvas', projectId]`.

## Web (`apps/web`)

- Зависимость `@xyflow/react`.
- Роут `/projects/:projectId/canvas` в `apps/web/src/app/app.tsx`; страница `pages/canvas.tsx`.
- API-клиент `apps/web/src/api/canvas.ts` (по образцу `api/wiki.ts`).
- React Flow:
  - Кастомная нода рендерит markdown (переиспользовать `MD_CLASSES`, `ReactMarkdown`+`remark-gfm`
    из `pages/wiki.tsx`); тулбар ноды: править текст, цвет, создать/привязать/отвязать задачу, удалить.
  - Связанная нода: бейдж «заголовок + статус» (цвет по колонке/приоритету), клик → переход на
    доску карточки (`/boards/:boardId`, при поддержке — открыть `CardDialog` через `?card=:id`).
    Если карточка удалена — нода просто теряет бейдж (становится обычной), без спец-пометки (v1).
  - Взаимодействие: дабл-клик по полотну → новая нода; протяжка от ручки ноды → ребро; drag-end
    (debounce ~300–500мс) → `PATCH` позиции/размера; pan/zoom, `Controls`, `MiniMap`.
  - Диалоги (shadcn): «Создать задачу» — `Select` доски; «Привязать задачу» — выбор из карточек
    проекта.
  - Данные — React Query (`['canvas', projectId]`), `useCanvasSocket` для live-обновления.
- Сайдбар `apps/web/src/components/layout/sidebar.tsx`: пункт **«Холст»** рядом с «Вики» для проекта.

## Чего НЕ делаем в v1 (YAGNI)

MCP/агент-доступ и `Activity`-трейс для холста; несколько холстов на проект; эмбеды вики-страниц
как ноды; цвета/типы/направления рёбер сверх простой стрелки с подписью; группы/фреймы нод.

## Verification

1. `npx prisma generate`; миграцию применить после разрешения drift в dev-БД.
2. api: `npx nx build api`, `npx nx test api`. Юнит-тесты сервиса: seed идемпотентен; create-task
   кладёт в колонку с min order и проставляет `cardId`; link-task валидирует проект и занятость;
   удаление карточки обнуляет `cardId` ноды (через `onDelete: SetNull`); доступ без membership — 403.
3. web: `npx nx build web`, `npx nx test web`.
4. E2E вручную (dev, `npx nx serve`):
   - Открыть `/projects/:id/canvas` → засеялось демо (ноды + стрелка), повторный заход не дублирует.
   - Дабл-клик → нода; правка markdown; протянуть стрелку; перетащить ноду — позиция сохраняется.
   - «Создать задачу» из ноды → выбрать доску → карточка появилась в первой колонке, на ноде бейдж,
     клик ведёт на доску.
   - «Привязать существующую» → бейдж появился; «отвязать» → нода снова обычная.
   - Удалить карточку на канбане → нода осталась как обычная markdown-нода (бейдж пропал).
   - Во второй вкладке/сессии изменения на холсте подтягиваются live (`board:changed`).

## Затрагиваемые файлы
- `prisma/schema.prisma` (+ миграция), back-relation на `Card`/`Project`.
- `libs/shared-types/src/lib/canvas.ts`, `libs/shared-types/src/index.ts`.
- `apps/api/src/canvas/` (module, controller, service, dto, starter-canvas seed), регистрация в `app.module.ts`.
- `apps/web/src/pages/canvas.tsx`, `apps/web/src/api/canvas.ts`, `apps/web/src/api/socket.ts`
  (`useCanvasSocket`), `apps/web/src/app/app.tsx`, `apps/web/src/components/layout/sidebar.tsx`,
  `package.json` (`@xyflow/react`).
