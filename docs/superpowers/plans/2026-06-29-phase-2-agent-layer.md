# Phase 2 — Агент-слой Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать агентам (Claude, OpenClaw) возможность создавать карточки, читать доску и двигать карточки по колонкам через MCP.

**Architecture:**

- `UnifiedAuthGuard` заменяет `JwtAuthGuard` глобально — принимает JWT-сессию пользователя ИЛИ Bearer API-токен агента (SHA-256 hash в БД).
- `apps/mcp` — standalone Node-процесс, `@modelcontextprotocol/sdk` (уже в workspace node_modules).
- Новый эндпоинт `GET /api/cards/:id` для детального чтения карточки.
- `columnKey` добавляется в `CardDto` — сейчас его нет, но MCP нужен чтобы показывать где карточка.

**Tech Stack:** NestJS 11, Prisma 7 (PostgreSQL), `@modelcontextprotocol/sdk` (уже установлен), Node `crypto` built-in для SHA-256.

---

## File Map

```
prisma/schema.prisma                              MODIFY — add ApiToken

libs/shared-types/src/lib/board.ts               MODIFY — CardDto +columnKey
libs/shared-types/src/lib/api-token.ts           CREATE — ApiTokenDto, CreateApiTokenResponse
libs/shared-types/src/index.ts                   MODIFY — export api-token.ts

apps/api/src/auth/unified-auth.guard.ts          CREATE
apps/api/src/auth/unified-auth.guard.spec.ts     CREATE
apps/api/src/auth/auth.module.ts                 MODIFY — swap to UnifiedAuthGuard

apps/api/src/api-tokens/api-tokens.module.ts     CREATE
apps/api/src/api-tokens/api-tokens.controller.ts CREATE — POST/GET/DELETE /api/api-tokens
apps/api/src/api-tokens/api-tokens.service.ts    CREATE
apps/api/src/api-tokens/api-tokens.service.spec.ts CREATE
apps/api/src/api-tokens/dto/create-api-token.dto.ts CREATE

apps/api/src/cards/card.mapper.ts                MODIFY — add columnKey
apps/api/src/cards/cards.controller.ts           MODIFY — GET /cards/:id
apps/api/src/cards/cards.service.ts              MODIFY — add getById()
apps/api/src/app/app.module.ts                   MODIFY — import ApiTokensModule

apps/mcp/project.json                            CREATE
apps/mcp/tsconfig.json                           CREATE
apps/mcp/tsconfig.app.json                       CREATE
apps/mcp/src/api-client.ts                       CREATE
apps/mcp/src/tools/list-boards.ts                CREATE
apps/mcp/src/tools/list-cards.ts                 CREATE
apps/mcp/src/tools/get-card.ts                   CREATE
apps/mcp/src/tools/create-card.ts                CREATE
apps/mcp/src/tools/move-card.ts                  CREATE
apps/mcp/src/main.ts                             CREATE
```

---

## Task 1: Prisma — ApiToken model

**Files:** `prisma/schema.prisma`

- [ ] **Step 1: Add ApiToken to schema**

```prisma
// prisma/schema.prisma — добавить в конец

model ApiToken {
  id         String    @id @default(cuid())
  userId     String
  name       String
  tokenHash  String    @unique  // SHA-256(rawToken) hex
  scope      String[]
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/dmitrijordin/checker_pro/moongatracker
npx prisma migrate dev --name add-api-token
```

Expected: `prisma/migrations/` получил новый файл, БД обновлена.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add ApiToken model"
```

---

## Task 2: shared-types — ApiTokenDto + CardDto.columnKey

**Files:**

- Create: `libs/shared-types/src/lib/api-token.ts`
- Modify: `libs/shared-types/src/lib/board.ts`
- Modify: `libs/shared-types/src/index.ts`

- [ ] **Step 1: Create api-token.ts**

```typescript
// libs/shared-types/src/lib/api-token.ts
export interface ApiTokenDto {
  id: string;
  name: string;
  scope: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiTokenResponse extends ApiTokenDto {
  token: string; // plain token, показывается ОДИН РАЗ
}
```

- [ ] **Step 2: Add columnKey to CardDto in board.ts**

Найти интерфейс `CardDto` и добавить поле:

```typescript
export interface CardDto {
  id: string;
  columnKey: ColumnKey; // <-- НОВОЕ
  title: string;
  body: string | null;
  priority: number;
  order: number;
  labels: LabelDto[];
}
```

- [ ] **Step 3: Export from index.ts**

```typescript
// libs/shared-types/src/index.ts
export * from './lib/board.js';
export * from './lib/auth.js';
export * from './lib/api-token.js'; // <-- НОВОЕ
```

- [ ] **Step 4: Commit**

```bash
git add libs/shared-types/
git commit -m "feat(types): add ApiTokenDto, CardDto.columnKey"
```

---

## Task 3: UnifiedAuthGuard + ApiTokensModule

`UnifiedAuthGuard` пробует JWT сначала. На ошибку — ищет ApiToken по `SHA-256(bearer)`. Устанавливает `req.user = { sub: userId, type: 'human'|'agent' }`. Существующий код использует `req.user.sub` — не ломается.

**Files:**

- Create: `apps/api/src/auth/unified-auth.guard.ts`
- Create: `apps/api/src/auth/unified-auth.guard.spec.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/api-tokens/dto/create-api-token.dto.ts`
- Create: `apps/api/src/api-tokens/api-tokens.service.ts`
- Create: `apps/api/src/api-tokens/api-tokens.service.spec.ts`
- Create: `apps/api/src/api-tokens/api-tokens.controller.ts`
- Create: `apps/api/src/api-tokens/api-tokens.module.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/auth/unified-auth.guard.spec.ts
import { UnifiedAuthGuard } from './unified-auth.guard';

function makeCtx(token: string | undefined, isPublic = false) {
  const req: any = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  return {
    req,
    ctx: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as any,
    reflector: { getAllAndOverride: () => isPublic } as any,
  };
}

describe('UnifiedAuthGuard', () => {
  it('allows public routes without token', async () => {
    const jwt = { verifyAsync: jest.fn() } as any;
    const prisma = { apiToken: { findUnique: jest.fn() } } as any;
    const { ctx, reflector } = makeCtx(undefined, true);
    const guard = new UnifiedAuthGuard(jwt, reflector, prisma);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('rejects with no token on protected route', async () => {
    const jwt = { verifyAsync: jest.fn() } as any;
    const prisma = { apiToken: { findUnique: jest.fn() } } as any;
    const { ctx, reflector } = makeCtx(undefined, false);
    const guard = new UnifiedAuthGuard(jwt, reflector, prisma);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('accepts valid JWT and sets req.user.type=human', async () => {
    const payload = { sub: 'u1', email: 'a@b.com' };
    const jwt = { verifyAsync: jest.fn().mockResolvedValue(payload) } as any;
    const prisma = { apiToken: { findUnique: jest.fn() } } as any;
    const { ctx, req, reflector } = makeCtx('valid-jwt');
    const guard = new UnifiedAuthGuard(
      jwt,
      { getAllAndOverride: () => false } as any,
      prisma,
    );
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(req.user).toMatchObject({ sub: 'u1', type: 'human' });
  });

  it('accepts valid API token and sets req.user.type=agent', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('bad')),
    } as any;
    const fakeToken = { id: 'tok1', userId: 'u2', scope: ['cards:write'] };
    const prisma = {
      apiToken: {
        findUnique: jest.fn().mockResolvedValue(fakeToken),
        update: jest.fn().mockResolvedValue(fakeToken),
      },
    } as any;
    const { ctx, req } = makeCtx('raw-token');
    const guard = new UnifiedAuthGuard(
      jwt,
      { getAllAndOverride: () => false } as any,
      prisma,
    );
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(req.user).toMatchObject({ sub: 'u2', type: 'agent' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/dmitrijordin/checker_pro/moongatracker
npx nx test api --testPathPattern=unified-auth.guard.spec
```

Expected: FAIL — "Cannot find module './unified-auth.guard'"

- [ ] **Step 3: Implement UnifiedAuthGuard**

```typescript
// apps/api/src/auth/unified-auth.guard.ts
import * as crypto from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@moongatracker/data-access';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const rawToken = header?.startsWith('Bearer ')
      ? header.slice(7)
      : undefined;
    if (!rawToken) throw new UnauthorizedException();

    // JWT first
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
      }>(rawToken);
      req.user = { sub: payload.sub, email: payload.email, type: 'human' };
      return true;
    } catch {
      // fall through
    }

    // ApiToken
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const apiToken = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
    });
    if (!apiToken) throw new UnauthorizedException();

    await this.prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });

    req.user = { sub: apiToken.userId, type: 'agent', scope: apiToken.scope };
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test api --testPathPattern=unified-auth.guard.spec
```

Expected: PASS (4 tests)

- [ ] **Step 5: Update auth.module.ts**

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '@moongatracker/data-access';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnifiedAuthGuard } from './unified-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-moongatracker',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    { provide: APP_GUARD, useClass: UnifiedAuthGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 6: Create ApiTokensModule files**

```typescript
// apps/api/src/api-tokens/dto/create-api-token.dto.ts
import { IsArray, IsIn, IsString, MinLength } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @IsIn(['cards:read', 'cards:write'], { each: true })
  scope!: string[];
}
```

```typescript
// apps/api/src/api-tokens/api-tokens.service.ts
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';

function toDto(row: {
  id: string;
  name: string;
  scope: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
}): ApiTokenDto {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ApiTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    name: string,
    scope: string[],
  ): Promise<CreateApiTokenResponse> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const row = await this.prisma.apiToken.create({
      data: { userId, name, tokenHash, scope },
    });
    return { ...toDto(row), token: rawToken };
  }

  async list(userId: string): Promise<ApiTokenDto[]> {
    const rows = await this.prisma.apiToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async revoke(userId: string, id: string): Promise<void> {
    await this.prisma.apiToken.deleteMany({ where: { id, userId } });
  }
}
```

```typescript
// apps/api/src/api-tokens/api-tokens.service.spec.ts
import * as crypto from 'crypto';
import { ApiTokensService } from './api-tokens.service';

describe('ApiTokensService', () => {
  it('create() stores SHA-256 hash, returns plain token once', async () => {
    let stored: any;
    const prisma = {
      apiToken: {
        create: jest.fn().mockImplementation(({ data }) => {
          stored = data;
          return {
            id: 'tok1',
            ...data,
            lastUsedAt: null,
            createdAt: new Date(),
          };
        }),
      },
    } as any;
    const svc = new ApiTokensService(prisma);
    const result = await svc.create('u1', 'ci', ['cards:read']);

    expect(result.token).toHaveLength(64);
    expect(stored.tokenHash).toBe(
      crypto.createHash('sha256').update(result.token).digest('hex'),
    );
    expect(result.token).not.toBe(stored.tokenHash);
  });

  it('revoke() filters by both id and userId', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const svc = new ApiTokensService({ apiToken: { deleteMany } } as any);
    await svc.revoke('u1', 'tok1');
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'tok1', userId: 'u1' },
    });
  });
});
```

```typescript
// apps/api/src/api-tokens/api-tokens.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

@Controller('api-tokens')
export class ApiTokensController {
  constructor(private readonly svc: ApiTokensService) {}

  @Post()
  create(
    @Body() dto: CreateApiTokenDto,
    @Req() req: any,
  ): Promise<CreateApiTokenResponse> {
    return this.svc.create(req.user.sub, dto.name, dto.scope);
  }

  @Get()
  list(@Req() req: any): Promise<ApiTokenDto[]> {
    return this.svc.list(req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.svc.revoke(req.user.sub, id);
  }
}
```

```typescript
// apps/api/src/api-tokens/api-tokens.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';

@Module({
  controllers: [ApiTokensController],
  providers: [ApiTokensService, PrismaService],
})
export class ApiTokensModule {}
```

- [ ] **Step 7: Run ApiTokens tests**

```bash
npx nx test api --testPathPattern=api-tokens.service.spec
```

Expected: PASS (2 tests)

- [ ] **Step 8: Add ApiTokensModule to app.module.ts**

```typescript
// apps/api/src/app/app.module.ts — добавить импорт:
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
// и в @Module({ imports: [...] }) добавить ApiTokensModule
```

- [ ] **Step 9: Smoke test**

```bash
npx nx serve api
# логин:
TOKEN=$(curl -s -X POST http://localhost:3020/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password"}' | jq -r .accessToken)
# создать api-токен:
curl -s -X POST http://localhost:3020/api/api-tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"mcp-agent","scope":["cards:read","cards:write"]}' | jq .
```

Expected: ответ содержит `token` (64 hex символа) + `id`, `name`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/api-tokens/ apps/api/src/app/app.module.ts
git commit -m "feat(auth): UnifiedAuthGuard + ApiToken CRUD"
```

---

## Task 4: GET /api/cards/:id + columnKey в CardDto

Нужен для MCP-инструмента `get_card`. Сейчас карточки возвращаются только внутри `GET /api/boards` вложенными в колонки — оттуда `columnKey` понятен из контекста. Для `GET /api/cards/:id` нужен `columnKey` прямо в карточке.

**Files:**

- Modify: `apps/api/src/cards/card.mapper.ts`
- Modify: `apps/api/src/cards/cards.service.ts`
- Modify: `apps/api/src/cards/cards.controller.ts`

- [ ] **Step 1: Update card.mapper.ts**

```typescript
// apps/api/src/cards/card.mapper.ts
import { CardDto } from '@moongatracker/shared-types';

export interface PrismaCardLike {
  id: string;
  columnKey: string; // <-- НОВОЕ
  title: string;
  body: string | null;
  priority: number;
  order: number;
  labels?: { label: { id: string; name: string; color: string } }[];
}

export function toCardDto(card: PrismaCardLike): CardDto {
  return {
    id: card.id,
    columnKey: card.columnKey as CardDto['columnKey'], // <-- НОВОЕ
    title: card.title,
    body: card.body,
    priority: card.priority,
    order: card.order,
    labels: (card.labels ?? []).map((cl) => ({
      id: cl.label.id,
      name: cl.label.name,
      color: cl.label.color,
    })),
  };
}
```

- [ ] **Step 2: Add getById() to cards.service.ts**

Добавить метод в конец класса `CardsService`:

```typescript
async getById(id: string): Promise<CardDto> {
  const card = await this.prisma.card.findUnique({
    where: { id },
    include: { labels: { include: { label: true } } },
  });
  if (!card) throw new NotFoundException(`Card ${id} not found`);
  return toCardDto(card);
}
```

- [ ] **Step 3: Add GET /cards/:id to cards.controller.ts**

Добавить метод в `CardsController` перед `@Patch`:

```typescript
@Get(':id')
getById(@Param('id') id: string): Promise<CardDto> {
  return this.cards.getById(id);
}
```

Добавить `Get` в импорт из `@nestjs/common`.

- [ ] **Step 4: Run api tests**

```bash
npx nx test api
```

Expected: все PASS. `cards.service.spec.ts` может потребовать добавить `columnKey: 'idea'` в mock-данные:

```typescript
// В fakePrisma.card.create mock-возврат добавить columnKey:
return {
  id: 'k9',
  columnKey: 'idea',   // <-- добавить
  title: data.title,
  ...
};
```

- [ ] **Step 5: Smoke test**

```bash
# Получить boardId из /api/boards, затем cardId из любой карточки:
curl -s http://localhost:3020/api/cards/<cardId> \
  -H "Authorization: Bearer $TOKEN" | jq '{id, columnKey, title}'
```

Expected: `{ "id": "...", "columnKey": "idea", "title": "..." }`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/cards/
git commit -m "feat(cards): GET /api/cards/:id + columnKey in CardDto"
```

---

## Task 5: apps/mcp — scaffold + 5 инструментов

**Files:** все файлы в `apps/mcp/`

- [ ] **Step 1: Create Nx project files**

```json
// apps/mcp/project.json
{
  "name": "mcp",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/mcp/src",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "outputPath": "dist/apps/mcp",
        "main": "apps/mcp/src/main.ts",
        "tsConfig": "apps/mcp/tsconfig.app.json",
        "assets": []
      }
    }
  }
}
```

```json
// apps/mcp/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "../../dist/apps/mcp"
  },
  "include": ["src/**/*"]
}
```

```json
// apps/mcp/tsconfig.app.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/apps/mcp",
    "types": ["node"]
  },
  "exclude": ["**/*.spec.ts"]
}
```

- [ ] **Step 2: Create api-client.ts**

```typescript
// apps/mcp/src/api-client.ts
const BASE = process.env['MOONGATRACKER_API_URL'] ?? 'http://localhost:3020';
const TOKEN = process.env['MOONGATRACKER_API_TOKEN'] ?? '';

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
});

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok)
    throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`PATCH ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Create tools**

```typescript
// apps/mcp/src/tools/list-boards.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { BoardDto } from '@moongatracker/shared-types';

export const listBoardsTool: Tool = {
  name: 'list_boards',
  description: 'Список досок с колонками и карточками',
  inputSchema: { type: 'object', properties: {}, required: [] },
};

export async function listBoards(): Promise<string> {
  const boards = await apiGet<BoardDto[]>('/api/boards');
  return JSON.stringify(boards, null, 2);
}
```

```typescript
// apps/mcp/src/tools/list-cards.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { BoardDto, CardDto, ColumnKey } from '@moongatracker/shared-types';

export const listCardsTool: Tool = {
  name: 'list_cards',
  description: 'Карточки доски с опциональным фильтром по колонке',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: { type: 'string', description: 'ID доски' },
      columnKey: {
        type: 'string',
        enum: ['idea', 'triage', 'backlog', 'in_dev', 'done'],
        description: 'Фильтр по колонке (опционально)',
      },
    },
    required: ['boardId'],
  },
};

export async function listCards(args: {
  boardId: string;
  columnKey?: ColumnKey;
}): Promise<string> {
  const boards = await apiGet<BoardDto[]>('/api/boards');
  const board = boards.find((b) => b.id === args.boardId);
  if (!board)
    return JSON.stringify({ error: `Board ${args.boardId} not found` });

  const cards: CardDto[] = board.columns.flatMap((c) => c.cards);
  const filtered = args.columnKey
    ? cards.filter((c) => c.columnKey === args.columnKey)
    : cards;

  return JSON.stringify(filtered, null, 2);
}
```

```typescript
// apps/mcp/src/tools/get-card.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CardDto } from '@moongatracker/shared-types';

export const getCardTool: Tool = {
  name: 'get_card',
  description: 'Детали карточки по ID',
  inputSchema: {
    type: 'object',
    properties: { cardId: { type: 'string' } },
    required: ['cardId'],
  },
};

export async function getCard(args: { cardId: string }): Promise<string> {
  const card = await apiGet<CardDto>(`/api/cards/${args.cardId}`);
  return JSON.stringify(card, null, 2);
}
```

```typescript
// apps/mcp/src/tools/create-card.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPost } from '../api-client.js';
import type { CardDto } from '@moongatracker/shared-types';

export const createCardTool: Tool = {
  name: 'create_card',
  description: 'Создать карточку. По умолчанию попадает в колонку idea.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: { type: 'string' },
      title: { type: 'string', maxLength: 200 },
      body: { type: 'string', maxLength: 2000 },
      columnKey: {
        type: 'string',
        enum: ['idea', 'triage', 'backlog', 'in_dev', 'done'],
        default: 'idea',
      },
    },
    required: ['boardId', 'title'],
  },
};

export async function createCard(args: {
  boardId: string;
  title: string;
  body?: string;
  columnKey?: string;
}): Promise<string> {
  const card = await apiPost<CardDto>('/api/cards', {
    boardId: args.boardId,
    title: args.title,
    body: args.body ?? null,
    columnKey: args.columnKey ?? 'idea',
  });
  return JSON.stringify(card, null, 2);
}
```

```typescript
// apps/mcp/src/tools/move-card.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPatch } from '../api-client.js';
import type { CardDto, ColumnKey } from '@moongatracker/shared-types';

export const moveCardTool: Tool = {
  name: 'move_card',
  description:
    'Переместить карточку в другую колонку (idea→triage→backlog→in_dev→done)',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string' },
      columnKey: {
        type: 'string',
        enum: ['idea', 'triage', 'backlog', 'in_dev', 'done'],
      },
    },
    required: ['cardId', 'columnKey'],
  },
};

export async function moveCard(args: {
  cardId: string;
  columnKey: ColumnKey;
}): Promise<string> {
  const card = await apiPatch<CardDto>(`/api/cards/${args.cardId}`, {
    columnKey: args.columnKey,
  });
  return JSON.stringify(card, null, 2);
}
```

- [ ] **Step 4: Create main.ts**

```typescript
// apps/mcp/src/main.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { listBoardsTool, listBoards } from './tools/list-boards.js';
import { listCardsTool, listCards } from './tools/list-cards.js';
import { getCardTool, getCard } from './tools/get-card.js';
import { createCardTool, createCard } from './tools/create-card.js';
import { moveCardTool, moveCard } from './tools/move-card.js';

const server = new Server(
  { name: 'moongatracker', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

const tools = [
  listBoardsTool,
  listCardsTool,
  getCardTool,
  createCardTool,
  moveCardTool,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let text: string;
    switch (name) {
      case 'list_boards':
        text = await listBoards();
        break;
      case 'list_cards':
        text = await listCards(args as any);
        break;
      case 'get_card':
        text = await getCard(args as any);
        break;
      case 'create_card':
        text = await createCard(args as any);
        break;
      case 'move_card':
        text = await moveCard(args as any);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return { content: [{ type: 'text', text }] };
  } catch (e: any) {
    return {
      content: [{ type: 'text', text: `Error: ${e.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 5: Test MCP server starts without errors**

```bash
cd /Users/dmitrijordin/checker_pro/moongatracker
MOONGATRACKER_API_TOKEN=<your-token> \
  node --import tsx/esm apps/mcp/src/main.ts
# Ctrl+C — должен запуститься без ошибок
```

- [ ] **Step 6: Commit**

```bash
git add apps/mcp/
git commit -m "feat(mcp): MCP server — list_boards, list_cards, get_card, create_card, move_card"
```

---

## Task 6: Claude Code MCP config

- [ ] **Step 1: Create .mcp.json in moongatracker root**

```json
// /Users/dmitrijordin/checker_pro/moongatracker/.mcp.json
{
  "mcpServers": {
    "moongatracker": {
      "command": "node",
      "args": ["--import", "tsx/esm", "apps/mcp/src/main.ts"],
      "cwd": "/Users/dmitrijordin/checker_pro/moongatracker",
      "env": {
        "MOONGATRACKER_API_URL": "http://localhost:3020",
        "MOONGATRACKER_API_TOKEN": "<вставить токен из Task 3>"
      }
    }
  }
}
```

- [ ] **Step 2: Verify tools visible in Claude Code**

Перезапустить сессию Claude Code в папке `moongatracker`. Должны появиться инструменты: `list_boards`, `list_cards`, `get_card`, `create_card`, `move_card`.

Smoke test:

```
list_boards → возвращает JSON с доской
create_card(boardId=..., title="Test from agent") → возвращает новую карточку
list_cards(boardId=..., columnKey="idea") → карточка видна
move_card(cardId=..., columnKey="triage") → карточка переехала
```

- [ ] **Step 3: Commit**

```bash
git add .mcp.json
git commit -m "chore(mcp): Claude Code MCP config for moongatracker agent"
```
