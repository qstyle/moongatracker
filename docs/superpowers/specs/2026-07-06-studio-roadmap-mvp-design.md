# Спека: Роадмап-вкладка проекта — MVP (Studio OS)

Дата: 2026-07-06 · Статус: согласован дизайн, ждёт плана реализации

## Context

Продукт разворачивается в **студию стартапов** (см. трекер РАЗР1-30 «[STUDIO] North Star»):
**каждый `Project` = отдельный стартап**, который команда людей + AI-агентов прогоняет
по конвейеру «от идеи до прода». Сейчас у проекта есть доски (исполнение), вики (знания),
canvas (моделирование), но нет **верхнеуровневого представления пути стартапа**.

Эта спека описывает MVP новой вкладки проекта **«Роадмап»**: дефолтный, но редактируемый
конвейер стадий, где **из каждой стадии можно создать доску**. Роадмап становится
навигационным «хребтом» венчура; доски — исполнением внутри стадии. Всё остальное
(гейты go/pivot/kill, плейбуки авто-задач, портфель, прогресс-роллап) навешивается
инкрементально позже и в scope MVP не входит.

## Goals

- Модель **`Stage`** — упорядоченные стадии проекта; 6 дефолтных сидируются при создании
  проекта, **редактируемы** (rename / add / remove / reorder / status) — паттерн как у колонок.
- **`Board.stageId?`** — доска может принадлежать стадии (nullable, обратная совместимость).
- Вкладка **«Роадмап»** (`/projects/:projectId/roadmap`): конвейер стадий, из стадии
  «＋ Создать доску», список досок стадии, отметка текущей стадии + продвижение.
- Ссылка «Роадмап» в сайдбаре проекта (рядом с «Вики» / «Холст»).

## Non-goals (позже, отдельные карточки)

- Гейты go/pivot/kill на переходе стадий (будет через `Proposal`, РАЗР1-13).
- Плейбуки авто-задач на стадию; артефакты-шаблоны (вики/canvas).
- Прогресс-роллап по карточкам; портфель всех венчуров; дайджест.
- Детальная проработка содержимого каждой стадии (делаем позже — стадии редактируемы).

## Дефолтные стадии (сид)

`Идея → Валидация → Дизайн → Разработка → Запуск → Прод`

`key` для сид-стадий: `idea | validate | design | build | launch | prod` (для будущих
плейбуков). Пользовательские стадии — `key = null`.

## Модель данных (`prisma/schema.prisma`)

```prisma
model Stage {
  id        String   @id @default(cuid())
  projectId String
  key       String?           // сид-ключ (idea…prod) или null для пользовательских
  title     String
  order     Int
  status    String   @default("not_started") // not_started | active | done
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  boards    Board[]

  @@index([projectId])
}
```

- `Project` получает `stages Stage[]`.
- `Board` получает `stageId String?` + `stage Stage? @relation(fields: [stageId], references: [id], onDelete: SetNull)`.
  **SetNull** намеренно: удаление стадии НЕ удаляет её доски — они становятся «без стадии».

Миграция: ручной SQL (локальная dev-БД дрейфует от истории — как в
`20260704120000_telegram_links` / `20260705140000_proposals`): `CREATE TABLE "Stage"`,
индекс, FK; `ALTER TABLE "Board" ADD COLUMN "stageId"` + FK `ON DELETE SET NULL`.
Применить `prisma db execute` + `migrate resolve --applied` + `prisma generate`.

## Сидирование дефолтных стадий

Проект создаётся в **двух** местах — обе должны сидить стадии:
- `apps/api/src/projects/projects.service.ts` → `create()` (там уже сидятся доска/колонка/вики).
- `apps/api/src/auth/auth.service.ts` → `register()` (создаёт персональный проект).

Вынести общий хелпер `buildDefaultStages(projectId)` (рядом с `buildStarterWiki` /
`buildOnboardingCards`) и вызвать в обоих `$transaction`. Первая стадия (`Идея`) сидируется
со `status: 'active'`, остальные — `not_started`.

Существующие проекты (без стадий) — стадии не бэкофиллятся автоматически; вкладка при
пустом списке показывает CTA «Создать стадии по умолчанию» (POST-сид по требованию).

## API (`apps/api/src/stages/…` — новый модуль; паттерн `columns`)

| Метод | Путь | Назначение |
|-------|------|-----------|
| GET | `/projects/:projectId/stages` | список стадий проекта (+ их доски) |
| POST | `/projects/:projectId/stages` | добавить стадию `{ title }` (order = max+1) |
| POST | `/projects/:projectId/stages/seed-defaults` | засидить 6 дефолтов (если пусто) |
| PATCH | `/stages/reorder` | `{ projectId, orderedIds }` — перестановка |
| PATCH | `/stages/:id` | `{ title?, status? }` |
| DELETE | `/stages/:id` | удалить (доски → `stageId = null`) |

Создание доски из стадии — расширить существующий
`POST /projects/:projectId/boards` необязательным `stageId` в теле (валидируется:
стадия принадлежит проекту). `BoardsService.create` принимает `stageId?` и пишет его.
Авторизация — `assertProjectAccess` (как во всех модулях). Ничего не `@Public`.

## shared-types (`libs/shared-types/src/lib/stage.ts`, экспорт в `index.ts`)

```ts
export type StageStatus = 'not_started' | 'active' | 'done';
export interface StageDto {
  id: string; projectId: string; key: string | null;
  title: string; order: number; status: StageStatus;
  boards: BoardSummaryDto[];      // доски стадии (для роадмап-вью)
}
```
`BoardSummaryDto` дополнить `stageId: string | null`.

## Web

**Клиент** `apps/web/src/api/stages.ts`: `fetchStages(projectId)`, `createStage`,
`seedDefaultStages`, `reorderStages`, `updateStage`, `deleteStage`. `createBoard` —
добавить необязательный `stageId`.

**Роут** `/projects/:projectId/roadmap` → `pages/roadmap.tsx` (регистрация в `app/app.tsx`).

**Сайдбар** `components/layout/sidebar.tsx` `ProjectSection`: добавить ссылку «Роадмап»
(иконка напр. `RiRoadMapLine`/`RiRouteLine`) перед «Вики», по образцу существующих
Link-ов Вики/Холст.

**Страница «Роадмап»:**
- Горизонтальный/вертикальный конвейер стадий; текущая (`active`) подсвечена, `done` отмечены.
- На стадии: заголовок (inline-rename), меню (удалить / статус), список её досок (клик →
  `/boards/:id`), кнопка **«＋ Создать доску»** (создаёт доску со `stageId`).
- Добавление стадии в конце; drag-reorder (dnd-kit, как колонки) — можно вынести во вторую
  итерацию, в MVP достаточно кнопок вверх/вниз или просто add/rename/delete.
- Кнопка «Продвинуть» на активной стадии: PATCH текущей `status=done`, следующей `status=active`.
- Пустое состояние (проект без стадий): CTA «Создать стадии по умолчанию» → `seed-defaults`.

## Обратная совместимость

- `Board.stageId` nullable → существующие доски работают как раньше; в сайдбаре показываются
  как и сейчас (плоским списком). Роадмап показывает только доски со `stageId`.
- Проекты без стадий не ломаются: вкладка предлагает засидить дефолты.

## Тесты

- **API-юнит** (`stages.service`): create/reorder/update/delete; удаление стадии обнуляет
  `Board.stageId`, а не удаляет доску; seed-defaults идемпотентен (не дублирует при непустом).
- **API-юнит** (`boards.service`): create со `stageId` пишет связь; `stageId` чужого проекта → отказ.
- **e2e/живой прогон**: создать проект → GET stages (6 дефолтов) → создать доску из стадии →
  доска в списке стадии → удалить стадию → доска осталась (stageId=null).

## Verification (end-to-end)

1. `npx nx test api` — юниты зелёные.
2. Поднять api+web; новый проект → вкладка «Роадмап» показывает 6 стадий, «Идея» активна.
3. Из «Валидации» создать доску → она под стадией; открыть → канбан.
4. Переименовать/добавить/удалить стадию; «Продвинуть» двигает активную стадию.
5. Старый проект без стадий → CTA сидирования работает.

## Открытые вопросы (на будущее, не блокируют MVP)

- Гейты на переходе (proposal go/pivot/kill) — отдельная карточка.
- Прогресс стадии: ручной статус (MVP) vs авто-роллап по карточкам досок.
- Плейбуки/шаблоны и авто-задачи агентов на входе в стадию.
- Портфель (кросс-проектный обзор венчуров по стадиям).
