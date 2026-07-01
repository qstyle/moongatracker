# Registration by username (email → username) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить email на username во всех слоях moongatracker; вход и регистрация по логину + паролю; страница регистрации из двух полей.

**Architecture:** Сквозной rename `email` → `username`: Prisma-модель + миграция (RENAME COLUMN, данные сохраняются), backend (DTO/сервис/контроллер/guard, JWT-claim), shared-types, web (формы логина/регистрации, приглашение участников, отображение), сид → no-op. Username нормализуется `trim().toLowerCase()`.

**Tech Stack:** NestJS 11 (Fastify), Prisma 7 (Postgres), class-validator, React + wouter + Vite, Nx, Jest.

---

## Файловая структура

**Backend / БД:**
- `prisma/schema.prisma` — `User.email` → `username`.
- `prisma/migrations/20260701140000_rename_email_to_username/migration.sql` — RENAME COLUMN (создать).
- `apps/api/src/auth/dto/auth.dto.ts` — RegisterDto/LoginDto по username.
- `apps/api/src/auth/auth.service.ts` — register/login/toResponse по username + нормализация.
- `apps/api/src/auth/auth.controller.ts` — проброс dto.username.
- `apps/api/src/auth/unified-auth.guard.ts` — payload/req.user username.
- `apps/api/src/projects/dto/add-member.dto.ts` — username.
- `apps/api/src/projects/projects.controller.ts` — dto.username.
- `apps/api/src/projects/projects.service.ts` — приглашение/маппинг по username.
- `apps/api/src/projects/projects.service.spec.ts` — моки под username.

**shared-types:**
- `libs/shared-types/src/lib/auth.ts` — AuthUser.username.
- `libs/shared-types/src/lib/board.ts` — MemberDto.username.

**Web:**
- `apps/web/src/api/auth.ts` — login/register по username.
- `apps/web/src/api/projects.ts` — addMember(username).
- `apps/web/src/pages/register.tsx` — два поля.
- `apps/web/src/components/auth/login.tsx` — логин + ссылка на регистрацию.
- `apps/web/src/pages/settings.tsx` — приглашение/таблица по username.
- `apps/web/src/components/canvas/flow-canvas.tsx` — me.username.

**Seed:**
- `prisma/seed.ts` — no-op.

---

### Task 1: Prisma-модель и миграция

**Files:**
- Modify: `prisma/schema.prisma:33-40`
- Create: `prisma/migrations/20260701140000_rename_email_to_username/migration.sql`

- [ ] **Step 1: Переименовать поле в модели User**

В `prisma/schema.prisma` заменить строку
```prisma
  email        String       @unique
```
на
```prisma
  username     String       @unique
```

- [ ] **Step 2: Создать файл миграции**

Создать `prisma/migrations/20260701140000_rename_email_to_username/migration.sql`:
```sql
-- Rename User.email -> User.username (data preserving).
-- The existing @unique index on "email" is renamed automatically by Postgres.
ALTER TABLE "User" RENAME COLUMN "email" TO "username";
```

- [ ] **Step 3: Перегенерировать Prisma-клиент**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` без ошибок (типы User теперь содержат `username`, не `email`).

- [ ] **Step 4: Коммит**

```bash
git add prisma/schema.prisma prisma/migrations/20260701140000_rename_email_to_username
git commit -m "feat(db): rename User.email -> username + migration"
```

> Применение к живой dev-БД (не блокирует сборку/типы; выполнять при наличии БД):
> `npx prisma db execute --file prisma/migrations/20260701140000_rename_email_to_username/migration.sql --schema prisma/schema.prisma`
> затем `npx prisma migrate resolve --applied 20260701140000_rename_email_to_username`.
> `prisma migrate dev` НЕ использовать (хочет reset — потеря данных). В контейнере применит `prisma migrate deploy`.

---

### Task 2: shared-types

**Files:**
- Modify: `libs/shared-types/src/lib/auth.ts:1-5`
- Modify: `libs/shared-types/src/lib/board.ts:84-90`

- [ ] **Step 1: AuthUser.email → username**

В `libs/shared-types/src/lib/auth.ts` заменить:
```ts
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}
```
на:
```ts
export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
}
```

- [ ] **Step 2: MemberDto.email → username**

В `libs/shared-types/src/lib/board.ts` в `interface MemberDto` заменить строку
```ts
  email: string;
```
на
```ts
  username: string;
```

- [ ] **Step 3: Сборка типов**

Run: `npx nx build shared-types`
Expected: сборка успешна.

- [ ] **Step 4: Коммит**

```bash
git add libs/shared-types/src/lib/auth.ts libs/shared-types/src/lib/board.ts
git commit -m "feat(shared-types): email -> username in AuthUser/MemberDto"
```

---

### Task 3: Backend auth (DTO, сервис, контроллер, guard)

**Files:**
- Modify: `apps/api/src/auth/dto/auth.dto.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/unified-auth.guard.ts`

- [ ] **Step 1: Переписать DTO**

Заменить весь `apps/api/src/auth/dto/auth.dto.ts` на:
```ts
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const USERNAME_RE = /^[a-z0-9_.-]+$/;

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(USERNAME_RE, {
    message: 'username may contain only a-z, 0-9, and _ . -',
  })
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
```

- [ ] **Step 2: Переписать auth.service.ts**

Заменить весь `apps/api/src/auth/auth.service.ts` на:
```ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@moongatracker/data-access';
import { AuthResponse } from '@moongatracker/shared-types';

interface UserRow {
  id: string;
  username: string;
  name: string | null;
  passwordHash: string;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private toResponse(user: UserRow): AuthResponse {
    const accessToken = this.jwt.sign({ sub: user.id, username: user.username });
    return {
      accessToken,
      user: { id: user.id, username: user.username, name: user.name },
    };
  }

  async register(username: string, password: string): Promise<AuthResponse> {
    const uname = normalizeUsername(username);
    const existing = await this.prisma.user.findUnique({
      where: { username: uname },
    });
    if (existing) throw new ConflictException('Username already in use');

    const passwordHash = await bcrypt.hash(password, 10);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: uname, passwordHash, name: null },
      });
      await tx.project.create({
        data: {
          name: `${uname}'s project`,
          memberships: { create: { userId: user.id } },
        },
      });
      return { user };
    });

    return this.toResponse(user);
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const uname = normalizeUsername(username);
    const user = await this.prisma.user.findUnique({
      where: { username: uname },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.toResponse(user);
  }
}
```

- [ ] **Step 3: Обновить контроллер**

В `apps/api/src/auth/auth.controller.ts` заменить тела методов:
```ts
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto.username, dto.password);
  }
```
и
```ts
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto.username, dto.password);
  }
```

- [ ] **Step 4: Обновить guard**

В `apps/api/src/auth/unified-auth.guard.ts` заменить блок JWT-верификации:
```ts
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        username: string;
      }>(rawToken);
      req.user = { type: 'user', sub: payload.sub, username: payload.username };
      return true;
```

- [ ] **Step 5: Собрать api**

Run: `npx nx build api`
Expected: сборка успешна (нет ссылок на `user.email`).

- [ ] **Step 6: Коммит**

```bash
git add apps/api/src/auth
git commit -m "feat(api): auth by username (dto, service, controller, guard)"
```

---

### Task 4: Backend projects (приглашение и маппинг по username)

**Files:**
- Modify: `apps/api/src/projects/dto/add-member.dto.ts`
- Modify: `apps/api/src/projects/projects.controller.ts:62`
- Modify: `apps/api/src/projects/projects.service.ts` (getMembers, addMember, updateMemberColor)
- Modify: `apps/api/src/projects/projects.service.spec.ts`

- [ ] **Step 1: Обновить тест (TDD — сначала правим ожидания)**

В `apps/api/src/projects/projects.service.spec.ts` заменить моки/вызовы:
- строку `user: { email: 'b@b.com', name: null },` (обе, строки 37 и 87) на `user: { username: 'bob', name: null },`
- строку `findUnique: async () => ({ id: 'u2', email: 'b@b.com', name: null }),` (строка 42) на `findUnique: async () => ({ id: 'u2', username: 'bob', name: null }),`
- строку `const result = await service.addMember('p1', 'b@b.com', 'caller');` (строка 55) на `const result = await service.addMember('p1', 'bob', 'caller');`

Если в файле есть ассерты вида `expect(result.email)` — заменить на `result.username` (значение `'bob'`). Мокать через `as any`, если tsc ругается на форму мока.

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx nx test api --testPathPattern=projects.service`
Expected: FAIL (сервис ещё возвращает `email`, тип/ассерты не сходятся).

- [ ] **Step 3: Переписать AddMemberDto**

Заменить весь `apps/api/src/projects/dto/add-member.dto.ts` на:
```ts
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_.-]+$/, {
    message: 'username may contain only a-z, 0-9, and _ . -',
  })
  username!: string;
}
```

- [ ] **Step 4: Обновить контроллер**

В `apps/api/src/projects/projects.controller.ts` строку
```ts
    return this.projects.addMember(projectId, dto.email, req.user.sub);
```
заменить на
```ts
    return this.projects.addMember(projectId, dto.username, req.user.sub);
```

- [ ] **Step 5: Обновить projects.service.ts**

В `apps/api/src/projects/projects.service.ts`:

(a) В `getMembers` в объекте маппинга заменить `email: m.user.email,` на `username: m.user.username,`.

(b) В `addMember` изменить сигнатуру и логику поиска:
```ts
  async addMember(
    projectId: string,
    username: string,
    callerUserId: string,
  ): Promise<MemberDto> {
    await assertMembership(this.prisma, callerUserId, projectId);

    const uname = username.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { username: uname },
    });
    if (!user)
      throw new NotFoundException(`User with username ${uname} not found`);
```
и в return этого метода заменить `email: membership.user.email,` на `username: membership.user.username,`.

(c) В `updateMemberColor` в финальном return заменить `email: membership!.user.email,` на `username: membership!.user.username,`.

- [ ] **Step 6: Запустить тест — убедиться, что проходит**

Run: `npx nx test api --testPathPattern=projects.service`
Expected: PASS.

- [ ] **Step 7: Собрать api**

Run: `npx nx build api`
Expected: сборка успешна.

- [ ] **Step 8: Коммит**

```bash
git add apps/api/src/projects
git commit -m "feat(api): project membership by username"
```

---

### Task 5: Web API-клиенты

**Files:**
- Modify: `apps/web/src/api/auth.ts`
- Modify: `apps/web/src/api/projects.ts:33-44`

- [ ] **Step 1: Переписать auth.ts**

Заменить весь `apps/web/src/api/auth.ts` на:
```ts
import { AuthResponse } from '@moongatracker/shared-types';
import { apiFetch, asJson, setToken } from './client';

export async function login(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await asJson<AuthResponse>(res);
  setToken(data.accessToken);
  return data;
}

export function logout(): void {
  setToken(null);
}

export async function register(
  username: string,
  password: string,
): Promise<void> {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await asJson<{ accessToken: string }>(res);
  setToken(data.accessToken);
}
```

- [ ] **Step 2: Обновить addMember в projects.ts**

В `apps/web/src/api/projects.ts` заменить функцию `addMember` на:
```ts
export function addMember(
  projectId: string,
  username: string,
): Promise<MemberDto> {
  return apiFetch(`/api/projects/${projectId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  }).then((r) => asJson<MemberDto>(r));
}
```

- [ ] **Step 3: Коммит**

```bash
git add apps/web/src/api/auth.ts apps/web/src/api/projects.ts
git commit -m "feat(web): api clients use username"
```

---

### Task 6: Web UI (регистрация, логин, настройки, канвас)

**Files:**
- Modify: `apps/web/src/pages/register.tsx`
- Modify: `apps/web/src/components/auth/login.tsx`
- Modify: `apps/web/src/pages/settings.tsx`
- Modify: `apps/web/src/components/canvas/flow-canvas.tsx:121`

- [ ] **Step 1: Переписать register.tsx (два поля)**

Заменить весь `apps/web/src/pages/register.tsx` на:
```tsx
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register } from '../api/auth';

export function RegisterPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(username.trim(), password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3">
        <div className="text-sm font-semibold uppercase tracking-wider">Регистрация</div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div className="flex flex-col gap-1">
          <Label>Логин</Label>
          <Input type="text" value={username} required minLength={3} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Пароль (мин. 6 символов)</Label>
          <Input type="password" value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Создание…' : 'Создать аккаунт'}</Button>
        <Button variant="link" asChild>
          <Link href="/login">Уже есть аккаунт? Войти</Link>
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Обновить login.tsx (поле «логин» + ссылка на регистрацию)**

Заменить весь `apps/web/src/components/auth/login.tsx` на:
```tsx
import { useState } from 'react';
import { Link } from 'wouter';
import { RiTBoxLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '../../api/auth';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch {
      setError('Неверный логин или пароль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-xs border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <div className="flex size-6 items-center justify-center bg-primary text-primary-foreground">
            <RiTBoxLine className="size-4" />
          </div>
          <div className="text-sm font-semibold tracking-tight">moongatracker</div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <Label>логин</Label>
            <Input type="text" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <Label>пароль</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={busy || !password || !username}>войти</Button>
          <Button variant="link" asChild>
            <Link href="/register">Нет аккаунта? Зарегистрироваться</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Обновить settings.tsx (приглашение и таблица по логину)**

В `apps/web/src/pages/settings.tsx`:

(a) Найти состояние приглашения (`inviteEmail`) и переименовать переменную и сеттер в `inviteUsername`/`setInviteUsername`. Объявление вида
```tsx
const [inviteEmail, setInviteEmail] = useState('');
```
заменить на
```tsx
const [inviteUsername, setInviteUsername] = useState('');
```

(b) В форме приглашения заменить обработчик и инпут:
```tsx
                if (!activeProject || !inviteUsername.trim()) return;
                setInviting(true);
                setInviteError('');
                try {
                  await addMember(activeProject.id, inviteUsername.trim());
                  setInviteUsername('');
```
и строку инпута:
```tsx
                <Input type="text" placeholder="логин" value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} />
```
и кнопку `disabled={inviting || !inviteUsername.trim()}`.

(c) Заголовок таблицы `<TableHead>Email</TableHead>` заменить на `<TableHead>Логин</TableHead>`.

(d) Ячейку `<TableCell>{m.email}</TableCell>` заменить на `<TableCell>{m.username}</TableCell>`.

- [ ] **Step 4: Обновить flow-canvas.tsx**

В `apps/web/src/components/canvas/flow-canvas.tsx` строку
```tsx
        name: me?.name || me?.email || 'Аноним',
```
заменить на
```tsx
        name: me?.name || me?.username || 'Аноним',
```

- [ ] **Step 5: Собрать web**

Run: `npx nx build web`
Expected: сборка успешна (нет ссылок на `.email`).

- [ ] **Step 6: Коммит**

```bash
git add apps/web/src/pages/register.tsx apps/web/src/components/auth/login.tsx apps/web/src/pages/settings.tsx apps/web/src/components/canvas/flow-canvas.tsx
git commit -m "feat(web): username login/register UI + member invite by username"
```

---

### Task 7: Seed → no-op

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Заменить seed.ts на no-op**

Заменить весь `prisma/seed.ts` на:
```ts
import 'dotenv/config';

// No seed data: users self-register via /register, which auto-creates a
// personal project. Kept as a valid `prisma db seed` target (Dockerfile CMD).
async function main() {
  console.log('seed: nothing to do');
}

main();
```

- [ ] **Step 2: Проверить запуск сида (при наличии БД — опционально)**

Run: `npx prisma db seed`
Expected: `seed: nothing to do`, код выхода 0. (Если нет доступа к БД — пропустить; скрипт БД не трогает.)

- [ ] **Step 3: Коммит**

```bash
git add prisma/seed.ts
git commit -m "chore(db): drop admin/demo seed (self-registration)"
```

---

### Task 8: Финальная верификация

**Files:** нет изменений.

- [ ] **Step 1: Полная сборка и типы**

Run: `npx nx run-many -t build --projects=shared-types,api,web && npx nx run api:typecheck`
Expected: все зелёные; ни в одном выводе нет ошибок про `email`/`username`.

- [ ] **Step 2: Проверить, что email нигде не остался в рантайме**

Run: `grep -rn "\.email\|email:" apps/api/src apps/web/src libs/shared-types/src --include="*.ts" --include="*.tsx" | grep -v "spec\|type=\"email\"" || echo "clean"`
Expected: `clean` (совпадений нет).

- [ ] **Step 3: Затронутые unit-тесты**

Run: `npx nx test api --testPathPattern=projects.service`
Expected: PASS.

---

## Self-Review

**Spec coverage:**
- «БД: rename email→username + миграция» → Task 1. ✅
- «Backend auth: DTO/сервис/контроллер/guard, JWT username, нормализация» → Task 3. ✅
- «projects: приглашение/маппинг по username, add-member dto» → Task 4. ✅
- «shared-types AuthUser/MemberDto» → Task 2. ✅
- «Web: register 2 поля, login + ссылка, api-клиенты, settings, flow-canvas» → Task 5, 6. ✅
- «Seed no-op» → Task 7. ✅
- «Тесты под username, моки as any» → Task 4 (Step 1). ✅
- «Критерии готовности: build web/api, typecheck, тесты; email отсутствует» → Task 8. ✅
- «Валидация username 3–30, a-z0-9_.-, lowercase» → Task 3 (DTO + normalizeUsername), Task 4 (AddMemberDto). ✅

**Placeholder scan:** все шаги содержат конечный код/команды; плейсхолдеров нет. ✅

**Type consistency:** поле `username` единообразно в Prisma (Task 1), shared-types `AuthUser.username`/`MemberDto.username` (Task 2), JWT `{sub, username}` и `req.user.username` (Task 3), `addMember(projectId, username, caller)` — сервис (Task 4) ↔ контроллер (Task 4) ↔ web-клиент `addMember(projectId, username)` (Task 5) ↔ форма (Task 6). Нормализация `trim().toLowerCase()` в auth.service и projects.service. ✅
