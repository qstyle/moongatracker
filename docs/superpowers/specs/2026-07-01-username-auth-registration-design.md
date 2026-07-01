# Регистрация по username: сквозная замена email → username

**Дата:** 2026-07-01
**Репозиторий:** `qstyle/moongatracker`

## Цель

Вход и регистрация в moongatracker по **логину (`username`) и паролю**, без email.
Страница регистрации содержит ровно два поля: логин и пароль. `email` удаляется из
модели и всех слоёв (аутентификация, JWT, приглашение участников, отображение, сид).

## Контекст (как есть сейчас)

- Backend `/api/auth/register` и `/api/auth/login` — `@Public`, работают по `email`.
- `RegisterDto = { email, password, name? }`, `LoginDto = { email, password }`.
- `register()` при создании юзера авто-создаёт ему персональный проект + membership.
- JWT-claim `email` кладётся в токен и в `req.user.email`, но **функционально нигде
  не читается** (идентификация везде по `req.user.sub`).
- Приглашение участников — по email (`projects.service.addMember`, `settings.tsx`).
- Frontend: страница `RegisterPage` (`/register`) уже подключена, но со страницы логина
  на неё **нет ссылки**; форма регистрации содержит email + password + необязательное имя.
- Сид создаёт админа `admin@moongatracker.local` / `moonga` + демо-проект/доску/карточки.

## Решение

Сквозной rename `email` → `username` во всех слоях + миграция с переименованием колонки
(данные сохраняются). Сид админа и демо-данных **удаляется** — первый вход выполняется
через саму регистрацию (новый юзер получает персональный проект автоматически).

### 1. БД (Prisma)

- `User.email String @unique` → `username String @unique`; поле `email` удаляется.
- Миграция: `ALTER TABLE "User" RENAME COLUMN "email" TO "username";` (data-preserving).
- Применение: в контейнере — `prisma migrate deploy` (в CMD уже есть). На dev-БД —
  аддитивно через `prisma db execute` + `prisma migrate resolve --applied`
  (у moongatracker `migrate dev` хочет reset — не используем).

### 2. Backend (api)

- `auth/dto/auth.dto.ts`:
  - `RegisterDto = { username, password }` — поля `email` и `name` убираются.
  - `LoginDto = { username, password }`.
  - Валидация `username`: `@IsString`, `@MinLength(3)`, `@MaxLength(30)`,
    `@Matches(/^[a-z0-9_.-]+$/)`. `password`: `@MinLength(6)` (register), `@MinLength(1)` (login).
- `auth/auth.controller.ts`: `register(dto.username, dto.password)`; `login(dto.username, dto.password)`.
- `auth/auth.service.ts`:
  - `UserRow.email` → `username`.
  - `register(username, password)`: нормализовать `username` (`trim().toLowerCase()`);
    `findUnique({ where: { username } })`; при конфликте — `ConflictException('Username already in use')`;
    создать юзера `{ username, passwordHash }`; имя авто-проекта `` `${username}'s project` ``.
  - `login(username, password)`: нормализовать `username`; `findUnique({ where: { username } })`.
  - `toResponse`: JWT `sign({ sub: user.id, username: user.username })`;
    `user: { id, username, name }`.
- `auth/unified-auth.guard.ts`: тип payload и `req.user` — `email` → `username`.
- `projects/dto/add-member.dto.ts`: `email` → `username` (валидация как выше).
- `projects/projects.controller.ts`: `addMember(projectId, dto.username, req.user.sub)`.
- `projects/projects.service.ts`: приглашение по `username`
  (`findUnique({ where: { username } })`, сообщение `User with username ${username} not found`);
  маппинг участников отдаёт `username` вместо `email`.

### 3. shared-types

- `lib/auth.ts`: `AuthUser.email` → `username`.
- `lib/board.ts`: `MemberDto.email` → `username`.

### 4. Web

- `pages/register.tsx`: ровно два поля — **Логин** и **Пароль**. Убрать поля email и имя.
  Вызов `register(username, password)`. Ссылка «Уже есть аккаунт? Войти» остаётся.
- `components/auth/login.tsx`: поле «почта» → «логин» (тип `text`); дефолтное значение
  убрать (пусто); добавить ссылку «Нет аккаунта? Зарегистрироваться» на `/register`.
- `api/auth.ts`: `login(username, password)`, `register(username, password)` (без `name`);
  тела запросов `{ username, password }`.
- `api/projects.ts`: `addMember(projectId, username)` — тело `{ username }`.
- `pages/settings.tsx`: форма приглашения по логину (state, `placeholder`, тип `text`);
  таблица участников — `m.username` вместо `m.email`.
- `components/canvas/flow-canvas.tsx`: `me?.name || me?.username || 'Аноним'`.

### 5. Seed

- `prisma/seed.ts`: удалить создание админа и демо-данных → сделать сид no-op
  (скрипт подключается и выходит без ошибок, чтобы `prisma db seed` в CMD не падал).
  CMD в Dockerfile не меняем.

### 6. Тесты

- `apps/api/src/projects/projects.service.spec.ts`: моки `user: { email }` → `{ username }`,
  ожидания маппинга участников.
- Auth-специи (если есть): под `username`. Моки — через `as any`
  (иначе `eslint --fix` вырежет касты и Stop-хук `tsc --noEmit` упадёт).

## Валидация username (принято)

`trim().toLowerCase()`, длина 3–30, разрешены `a-z 0-9 _ . -`. Нормализация и при
регистрации, и при логине — чтобы `Admin`/`admin` не двоились.

## Вне скоупа

- Смена пароля / восстановление доступа.
- Профиль пользователя, отдельное поле display-name (поле `name` в модели остаётся,
  но при регистрации не заполняется).

## Критерии готовности

1. `/register` — форма из двух полей (логин + пароль); успешная регистрация логинит и
   ведёт в приложение с персональным проектом.
2. Вход по логину + паролю; email нигде не требуется и не отображается.
3. Приглашение участника — по логину; в настройках у участников виден логин.
4. `email` отсутствует в схеме, DTO, shared-types и UI.
5. `nx build web`, `nx build api`, `nx run api:typecheck`, затронутые unit-тесты — зелёные.
