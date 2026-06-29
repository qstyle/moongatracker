# Moongatracker — план: мультитенант-иерархия + агент-токены + скриншоты

Дата: 2026-06-29
Статус: **черновик, в работе** (думаем дальше, не финал)

## Решения (зафиксированы)

- **Мультитенант**: много организаций в одном инстансе, данные изолированы по `orgId`.
  (Пересматривает прежний YAGNI на мультитенант в `DESIGN.md`.)
- **Одна канбан-доска на проект**: `Project` = доска. Прежний `Board` переименовываем в `Project`.
- **Скриншоты** → внешнее объектное хранилище (S3/MinIO); в БД только ключ/метаданные.
- **Токен AI-агента** — скоуп = вся организация.
- **Участники**: добавляются по email, ролей пока нет — у всех полный доступ.
- **API агента**: REST (Bearer-токен) + MCP-сервер (`apps/mcp`).
- **Реализация**: поэтапно, отдельный спек на каждую фазу.

## Новая иерархия

```
Organization ──► Project (= 1 канбан-доска) ──► Column ──► Card ──► Attachment(screenshot)
     │
     ├─ Membership (User, по почте, без ролей — полный доступ)
     └─ ApiToken (AI-агент, скоуп = вся орга) ──► MCP-сервер
```

## Модель данных (Prisma)

| Модель         | Что делаем                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `Organization` | **новая**: `{ id, name, createdAt }`                                                                 |
| `Membership`   | **новая**: `{ id, orgId, userId, createdAt }`, `@@unique([orgId, userId])`; ролей нет                |
| `User`         | + JWT-auth (email-логин, `passwordHash` уже есть)                                                    |
| `Project`      | **переименование `Board`** + `orgId`                                                                 |
| `Column`       | `boardId` → `projectId`                                                                              |
| `Card`         | `boardId` → `projectId`                                                                              |
| `Label`        | `boardId` → `projectId`                                                                              |
| `ApiToken`     | **новая**: `{ id, orgId, name, tokenHash, scopes, lastUsedAt, createdAt }`                           |
| `Attachment`   | **новая**: `{ id, cardId, storageKey, filename, contentType, size, createdBy, createdAt }` (S3-ключ) |
| `Activity`     | **новая** (фаза 2): трейс мутаций агента + откат                                                     |

Изоляция по `orgId` — на уровне `data-access`, не вразнобой в контроллерах.

## Фазы

### Фаза 1 — Мультитенант-фундамент: орг + auth + проекты + доска

**Backend**

- JWT-auth: `POST /api/auth/register`, `/auth/login`, `/auth/me`; guard на ручки.
- `Organization` CRUD: создать оргу, список своих орг.
- `Project` CRUD внутри орги; миграция `Board → Project` (+ `orgId`).
- Перевесить `cards`/`columns`/`boards`-контроллеры на `projectId` + org-скоуп.
- Сид: демо-орга + демо-проект.

**Frontend**

- Экраны login / register.
- Контекст текущей орги + переключатель орг.
- Список проектов в орге, создание проекта.
- Канбан текущего `Board`-компонента, привязанный к проекту.
- Навигация: Орга → Проекты → Доска.

**Готово:** регистрируюсь, создаю оргу и проекты, веду канбан руками.

### Фаза 2 — Участники + токены агента + MCP

**Backend**

- Добавление участника по email (есть юзер → привязка; нет → создаём), без ролей.
- `ApiToken` (org-скоуп): создать/отозвать, `tokenHash`, scopes (`cards:read|write`, `comments:write`).
- Guard по `Authorization: Bearer <token>` → `actorType=agent`.
- `Activity`-трейс на мутации + эндпоинт отката.
- `apps/mcp`: MCP-обёртка над REST (`list_projects`, `list_cards`, `get_card`, `create_card`, `update_card`, `move_card`, `comment_card`, `list_activity`).

**Frontend**

- Управление участниками орги (добавить по почте, удалить).
- Управление API-токенами (создать → показать раз, отозвать, `lastUsedAt`).
- Маркер «agent» на действиях/комментариях, история карточки.

**Готово:** добавляю людей и агента, агент рулит доской через MCP, действия видны и обратимы.

### Фаза 3 — Скриншоты на карточках

**Backend**

- Интеграция S3/MinIO (env-конфиг), presigned-upload или прокси-загрузка.
- `Attachment` CRUD: прикрепить, список, удалить (чистка объекта в S3).

**Frontend**

- В `CardDialog`: загрузка файла + вставка из буфера (Ctrl+V скриншота), превью-галерея, удаление, лайтбокс.
- Бейдж кол-ва вложений на `CardTile`.

**Готово:** к карточке можно прикрепить скриншоты, посмотреть и удалить.

## Принципы

- YAGNI: ролей нет, полный доступ; SSO/аналитику не тащим.
- Каждая фаза деплоится и проверяется до следующей.
- Обновить `docs/DESIGN.md` и `ROADMAP.md` под новую иерархию.

## Канбан: управление проектом и колонками (решено 2026-06-29)

Колонки становятся свободными под каждый проект (не фикс-набор). Решения:

- Подложка колонки — **единый визуальный контейнер** (один стиль на все, без цвета, без поля в БД).
- Удаление колонки с карточками — **запрещено** (409, пока не пустая).
- View-переключатель «Всё/Идеи/Разработка» — **убрать совсем**.

### Изменение модели

- `Card.columnKey` (enum-строка) → **`Card.columnId`** (FK на `Column`).
- `Column` теряет `key` и `@@unique([…, key])`; остаётся `{ id, projectId, title, order }`.
- `shared-types`: удалить `ColumnKey`, `COLUMN_KEYS`; `ColumnDto` без `key`; `CardDto`/inputs — `columnId`.
- Удалить `apps/web/src/lib/views.ts`, `ViewSwitch`, тип `ViewId`.
- Миграция: маппинг старый `key → columnId`, перенос карточек.

### Backend (api)

- `PATCH /api/projects/:id { name }` — переименование проекта.
- Новый модуль `columns`:
  - `POST /api/columns { projectId, title }` (в конец, `order = max+1`).
  - `PATCH /api/columns/:id { title?, order? }`.
  - `PATCH /api/columns/reorder { projectId, orderedIds[] }`.
  - `DELETE /api/columns/:id` — 409, если есть карточки.
- `cards.service`: `move`/`update` по `columnId`.

### Frontend (apps/web)

- Инлайн-редактирование имени проекта в шапке.
- Подложка-контейнер у каждой колонки (единый стиль).
- Меню заголовка колонки (⋯): переименовать (инлайн), удалить (блок, если не пустая).
- Композер «+ колонка» в конце доски.
- Горизонтальный DnD перестановки колонок (`horizontalListSortingStrategy`) → `PATCH /columns/reorder`.
- Удалить `view-switch.tsx`/`views.ts`; `Board` рендерит `project.columns`.

## Автор и исполнитель карточки (решено 2026-06-29)

И автор, и исполнитель могут быть человеком или AI-агентом; различаем по credential
запроса (JWT → `user`, Bearer-токен → `agent`). Исполнитель — **один или никто**.

### Модель (полиморфный actor, как в `Comment`)

- `Card.authorType: 'user' | 'agent'`, `authorId` — `User.id` или `ApiToken.id`.
- `Card.assigneeType: 'user' | 'agent' | null`, `assigneeId: string | null`.
- **Автор** ставится автоматически из принципала при создании, неизменен.
- **Исполнитель** — один, вручную, может быть пустым (`PATCH /cards/:id`).
- Агент = токен; имя берём из `ApiToken.name`. Токены **отзываем, не удаляем физически**
  (чтобы имя автора/исполнителя не терялось).
- FK-ограничений нет (полиморфизм); пропавший актор → резолвер отдаёт «неизвестно».

### shared-types

- `ActorDto { type: 'user' | 'agent', id, name }`.
- `CardDto` отдаёт резолвнутые `author: ActorDto`, `assignee: ActorDto | null`.
- `UpdateCardInput.assignee?: { type, id } | null`.

### Backend (api)

- Auth-контекст даёт принципала `{ type, id }`.
- `cards.create`: автор = принципал. `cards.update`: валидирует исполнителя по орге.
- Mapper резолвит `authorId/assigneeId → ActorDto` (джойн users + tokens орги).
- `GET /api/projects/:id/actors` → members + agent-tokens для пикера.

### Frontend (apps/web)

- `ActorChip` (имя + маркер человек/агент); чип исполнителя на `CardTile`.
- `CardDialog`: автор (read-only) + пикер исполнителя (single + «не назначен»).

### Зависимость по фазам

Поля автора/исполнителя добавляем в модель сейчас. Агент как актор реально появляется
в **Фазе 2** (есть `ApiToken` + токен-auth). В Фазе 1: автор = создатель-`user`,
исполнитель — только участник орги.

## Открытые вопросы (думаем дальше)

- Регистрация: личная орга сразу или потом «создать организацию»?
- Демо-сид: сносить или переносить в демо-оргу?
- Realtime (Socket.IO) — в этих фазах или откладываем?
- MinIO локально в docker-compose или внешний S3 (как Postgres)?
