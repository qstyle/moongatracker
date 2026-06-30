# Moongatracker — спек: мультитенант-иерархия

Дата: 2026-06-29  
Статус: **актуален**, фазы соответствуют Phase 3–5 в `docs/ROADMAP.md`

## Иерархия

```
Organization ──► Project (= 1 канбан-доска) ──► Column ──► Card ──► Attachment(screenshot)
     │
     ├─ Membership (User, по почте, без ролей — полный доступ)
     └─ ApiToken (AI-агент, скоуп = вся орга)
```

## Зафиксированные решения

- Мультитенант: много орг в одном инстансе, изоляция по `orgId` на уровне `data-access`.
- `Board` → `Project` (одна доска на проект).
- Колонки свободные (не фикс-набор), view-переключатель убрать.
- Приоритет карточки: `urgent / normal / low / null` вместо меток и числового `priority`.
- Автор и исполнитель карточки — полиморфные (user или agent).
- S3-бакет внешний, через env-переменные; MinIO в compose не поднимаем.
- Токен AI-агента — скоуп = вся орга, отзываем не удаляем физически.
- Участники добавляются по email, ролей нет — полный доступ.

## Модель данных (итоговая Prisma-схема)

```
Organization  { id, name, createdAt }
Membership    { id, orgId, userId, createdAt }  @@unique([orgId, userId])
User          { id, email, name, passwordHash, createdAt }
ApiToken      { id, orgId, name, tokenHash, scopes, lastUsedAt, createdAt, revokedAt }
Project       { id, orgId, name, createdAt }                        // переименован из Board
Column        { id, projectId, title, order }                       // убран key
Card          { id, projectId, columnId, title, body,               // columnId вместо columnKey
                priority,                                           // String? urgent|normal|low
                authorType, authorId,                               // user|agent
                assigneeType, assigneeId,                           // user|agent|null
                order, createdAt, updatedAt }
Comment       { id, cardId, authorType, authorId, body, createdAt }
Activity      { id, cardId, actorType, actorId, action, before, after, createdAt }
Attachment    { id, cardId, storageKey, filename, contentType, size, createdBy, createdAt }
```

Удалить: `Label`, `CardLabel`, `Column.key`, `Card.columnKey`, `Card.priority: Int`, `ApiToken.userId`.

---

## Фаза 1 — Мультитенант + sidebar + настройки (ROADMAP Phase 3)

### Схема (Prisma)

- `Board → Project` + добавить `orgId`.
- `Column`: убрать `key`, `boardId → projectId`.
- `Card`: `columnKey → columnId` (FK), `priority: Int → String?`, добавить `authorType/authorId/assigneeType/assigneeId`, `boardId → projectId`.
- Удалить `Label`, `CardLabel`.
- Добавить `Organization`, `Membership`.
- `ApiToken.userId → ApiToken.orgId`.
- Миграция: маппинг `columnKey → columnId`, старый числовой `priority` сбросить в null.

### Backend

- JWT-auth guard на все ручки; `POST /auth/register`, `/auth/login`, `/auth/me`.
- `Organization`: создать, список своих орг, `PATCH /api/orgs/:id { name }`.
- `Project` CRUD с org-скоупом; `PATCH /api/projects/:id { name }`.
- Модуль `columns`:
  - `POST /api/columns { projectId, title }` (в конец, `order = max+1`)
  - `PATCH /api/columns/:id { title?, order? }`
  - `PATCH /api/columns/reorder { projectId, orderedIds[] }`
  - `DELETE /api/columns/:id` → 409, если есть карточки
- `cards.service`:
  - сортировка `(priority weight desc, order asc)` внутри колонки
  - при создании: автор = принципал из JWT/Bearer
  - `PATCH /cards/:id` принимает `priority`, `assignee?: { type, id } | null`
- `GET /api/projects/:id/actors` → members + agent-tokens орги (для пикера исполнителя).
- Удалить модуль `labels`.
- `shared-types`:
  - `CardPriority = 'urgent' | 'normal' | 'low'`
  - `PRIORITIES: { key, label, color, weight }[]`
  - `ActorDto { type: 'user'|'agent', id, name }`
  - `CardDto`: `priority: CardPriority | null`, `author: ActorDto`, `assignee: ActorDto | null`, `columnId`
  - Убрать `ColumnKey`, `COLUMN_KEYS`, `LabelDto`, `labels`
- Сид: демо-орга + демо-проект с колонками.

### Frontend

- Роутер: `/login`, `/register`, `/projects/:projectId`, `/settings`.
- Экраны login / register.
- Список проектов орги, создание проекта.
- Канбан привязан к `projectId`:
  - колонки свободные: инлайн-переименование, меню (⋯) → удалить (блок если не пустая), горизонтальный DnD (`horizontalListSortingStrategy`)
  - композер «+ колонка» в конце доски
  - инлайн-редактирование имени проекта в шапке
- `PriorityDot`/`PriorityChip` по `PRIORITIES`; `CardTile`: левая акцент-полоска + точка.
- `CardDialog`: селектор приоритета (3 цветных + «нет»); DnD clamp в границах цвет-группы.
- `ActorChip` (имя + маркер user/agent); чип исполнителя на `CardTile`.
- `CardDialog`: автор (read-only) + пикер исполнителя (single + «не назначен»).
- Удалить `view-switch.tsx`, `views.ts`, `label-chip.tsx`.
- `<Sidebar />` (фиксированный ~220 px, на мобиле — бургер):
  - переключатель орг (если > 1)
  - список проектов орги, «+ Новый проект»
  - ссылка «Настройки» → `/settings`
  - профиль / выход
- Страница `/settings` с вкладками:
  - **Организация** — переименование (полностью рабочая)
  - **Участники** — только список (добавление/удаление — Phase 4)
  - **AI-агенты** — только список (создание/отзыв — Phase 4)

**Готово:** регистрируюсь, создаю оргу и проекты, хожу между ними через sidebar, веду канбан с приоритетами и исполнителями.

---

## Фаза 2 — Участники + токены агента + MCP + настройки (ROADMAP Phase 4)

### Backend

- `POST /api/orgs/:orgId/members { email }` — есть юзер → привязка, нет → создать.
- `DELETE /api/orgs/:orgId/members/:userId`.
- `ApiToken` CRUD: `POST /api/orgs/:orgId/tokens { name, scopes }`, `DELETE /api/orgs/:orgId/tokens/:tokenId` (soft-revoke).
- Guard по `Authorization: Bearer <token>` → `actorType=agent`.
- `Activity`-трейс на все мутации агента + `POST /api/activity/:id/revert`.
- MCP (`apps/mcp`): `list_projects`, `list_cards`, `get_card`, `create_card`, `update_card`, `move_card`, `comment_card`, `list_activity`.

### Frontend

- Маркер «agent» на комментариях и в истории карточки.
- `CardDialog`: вкладка «История» — лента Activity с актором и кнопкой «Откатить».
- `/settings`: вкладки **Участники** и **AI-агенты** становятся полностью рабочими.

**Готово:** добавляю людей и агента через настройки, агент рулит доской через MCP, действия видны и обратимы.

---

## Фаза 3 — Скриншоты на карточках (ROADMAP Phase 5)

### Backend

- S3 внешний: env `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`.
- `POST /api/attachments/presign { cardId, filename, contentType }` → presigned URL (фронт льёт напрямую).
- `GET /api/cards/:id/attachments`, `DELETE /api/attachments/:id` (чистит объект в S3).

### Frontend

- `CardDialog`: загрузка файла + вставка Ctrl+V, превью-галерея, удаление, лайтбокс.
- Бейдж кол-ва вложений на `CardTile`.

**Готово:** к карточке можно прикрепить скриншоты, посмотреть и удалить.

---

## Фаза 4 — Боковое меню + страница настроек (ROADMAP Phase 6)

### Frontend

- `<Sidebar />` (фиксированный, ~220 px; на мобиле — бургер):
  - переключатель орг (если орг > 1)
  - список проектов орги, «+ Новый проект»
  - ссылка «Настройки» → `/settings`
  - профиль / выход
- Страница `/settings` с вкладками:
  - **Участники**: таблица (email + дата + кнопка удалить) + форма «Добавить по email».
  - **AI-агенты**: таблица (имя + scopes + lastUsedAt + «Отозвать») + форма создания + модал с токеном (показать один раз).
  - **Организация**: переименование.

**Готово:** навигация через sidebar; добавляю/удаляю людей и агентов через /settings.

---

## Открытые вопросы

- Регистрация: личная орга создаётся автоматически или отдельным шагом?
- Демо-сид: сносить или переносить в демо-оргу?
- Socket.IO realtime — в Фазе 1 или откладываем?
