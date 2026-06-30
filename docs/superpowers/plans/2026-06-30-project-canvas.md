# Project Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в moongatracker per-project «обсидиан-холст»: полотно со свободными markdown-нодами и стрелками, у нод опциональная связь с карточкой канбана, совместное редактирование через soft-lock, read-only MCP.

**Architecture:** Зеркалим модуль вики (`apps/api/src/wiki/`): Prisma-модели на проекте → shared-types DTO → NestJS-модуль (контроллер/сервис/dto) под `projects/:projectId/canvas` → web-страница на React Flow → read-only MCP-тула. Realtime — апгрейд существующего `EventsGateway` до двусторонних `canvas:*` сообщений с in-memory локом на проект.

**Tech Stack:** NestJS+Fastify, Prisma/PostgreSQL, Socket.IO, `libs/shared-types`, Vite+React+wouter+shadcn, `@tanstack/react-query`, `@xyflow/react` (React Flow), MCP SDK.

**Спека:** `docs/superpowers/specs/2026-06-30-project-canvas-design.md`.

**Команды (Nx, npm):** билд `npx nx build <proj>`, тесты `npx nx test <proj>` (проекты: `api`, `web`, `shared-types`, `data-access`). Прогон одного спека — `npx nx test api --testFile=<path>` или `npx jest <path>` из корня.

**Важно (из контекста репо):**
- `req.user` ставит глобальный `UnifiedAuthGuard`: для человека `{ type:'user', sub, email }`, для агента `{ type:'agent', projectId, tokenId }`.
- `assertMembership(prisma, userId, projectId)` из `@moongatracker/data-access` бросает `ForbiddenException`, если нет membership.
- Карточки создаются с `order = (max(order в колонке) ?? -1) + 1` (см. `apps/api/src/cards/cards.service.ts`).
- В dev-БД есть Prisma drift — миграцию применяем как в фиче цветов: `npx prisma db execute --file <migration.sql>` + `npx prisma migrate resolve --applied <name>`.
- Шейред-либы импортируются с расширением `.js` в исходниках (`@moongatracker/...`); смотри существующие импорты.

---

## Task 1: Prisma — модели CanvasNode / CanvasEdge + миграция

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260630230000_add_canvas/migration.sql`

- [ ] **Step 1: Добавить модели и обратные связи в схему**

В `prisma/schema.prisma` в модель `Project` добавить две строки в список связей:
```prisma
  canvasNodes  CanvasNode[]
  canvasEdges  CanvasEdge[]
```
В модель `Card` добавить обратную связь (nullable 1:1):
```prisma
  canvasNode CanvasNode?
```
В конец файла добавить:
```prisma
model CanvasNode {
  id        String   @id @default(cuid())
  projectId String
  text      String   @default("")
  x         Float
  y         Float
  width     Float    @default(240)
  height    Float    @default(120)
  color     String?
  cardId    String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  card      Card?       @relation(fields: [cardId], references: [id], onDelete: SetNull)
  outEdges  CanvasEdge[] @relation("CanvasEdgeSource")
  inEdges   CanvasEdge[] @relation("CanvasEdgeTarget")

  @@index([projectId])
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

  @@index([projectId])
  @@index([sourceNodeId])
  @@index([targetNodeId])
}
```

- [ ] **Step 2: Сгенерировать клиент и проверить схему**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` без ошибок валидации схемы.

- [ ] **Step 3: Написать миграцию вручную** (dev-БД с drift — `migrate dev` не используем)

Создать `prisma/migrations/20260630230000_add_canvas/migration.sql`:
```sql
CREATE TABLE "CanvasNode" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "width" DOUBLE PRECISION NOT NULL DEFAULT 240,
  "height" DOUBLE PRECISION NOT NULL DEFAULT 120,
  "color" TEXT,
  "cardId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CanvasNode_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CanvasEdge" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceNodeId" TEXT NOT NULL,
  "targetNodeId" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CanvasEdge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CanvasNode_cardId_key" ON "CanvasNode"("cardId");
CREATE INDEX "CanvasNode_projectId_idx" ON "CanvasNode"("projectId");
CREATE INDEX "CanvasEdge_projectId_idx" ON "CanvasEdge"("projectId");
CREATE INDEX "CanvasEdge_sourceNodeId_idx" ON "CanvasEdge"("sourceNodeId");
CREATE INDEX "CanvasEdge_targetNodeId_idx" ON "CanvasEdge"("targetNodeId");
ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "CanvasNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "CanvasNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Применить миграцию к dev-БД и пометить applied**

Run:
```bash
npx prisma db execute --file prisma/migrations/20260630230000_add_canvas/migration.sql
npx prisma migrate resolve --applied 20260630230000_add_canvas
```
Expected: `Script executed successfully.` и `Migration ... marked as applied.`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260630230000_add_canvas
git commit -m "feat(canvas): prisma models CanvasNode/CanvasEdge + migration"
```

---

## Task 2: shared-types — DTO холста

**Files:**
- Create: `libs/shared-types/src/lib/canvas.ts`
- Modify: `libs/shared-types/src/index.ts`

- [ ] **Step 1: Создать `libs/shared-types/src/lib/canvas.ts`**

```typescript
export interface LinkedCardDto {
  id: string;
  boardId: string;
  title: string;
  columnTitle: string;
  priority: string | null;
}

export interface CanvasNodeDto {
  id: string;
  projectId: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
  cardId: string | null;
  card: LinkedCardDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasEdgeDto {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
}

export interface CanvasDto {
  nodes: CanvasNodeDto[];
  edges: CanvasEdgeDto[];
}

export interface CreateCanvasNodeInput {
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string | null;
}

export interface UpdateCanvasNodeInput {
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string | null;
}

export interface CreateCanvasEdgeInput {
  sourceNodeId: string;
  targetNodeId: string;
  label?: string | null;
}

export interface UpdateCanvasEdgeInput {
  label?: string | null;
}

export interface CreateTaskFromNodeInput {
  boardId: string;
}

export interface LinkTaskInput {
  cardId: string;
}
```

- [ ] **Step 2: Экспортировать из barrel**

В `libs/shared-types/src/index.ts` добавить строку (рядом с прочими `export *`):
```typescript
export * from './lib/canvas.js';
```

- [ ] **Step 3: Сборка типов**

Run: `npx nx build shared-types`
Expected: успешная сборка.

- [ ] **Step 4: Commit**

```bash
git add libs/shared-types/src/lib/canvas.ts libs/shared-types/src/index.ts
git commit -m "feat(canvas): shared-types DTOs"
```

---

## Task 3: API — DTO-классы

**Files:**
- Create: `apps/api/src/canvas/dto/create-node.dto.ts`
- Create: `apps/api/src/canvas/dto/update-node.dto.ts`
- Create: `apps/api/src/canvas/dto/create-edge.dto.ts`
- Create: `apps/api/src/canvas/dto/update-edge.dto.ts`
- Create: `apps/api/src/canvas/dto/create-task-from-node.dto.ts`
- Create: `apps/api/src/canvas/dto/link-task.dto.ts`

- [ ] **Step 1: Создать DTO (стиль как `wiki/dto/*`)**

`create-node.dto.ts`:
```typescript
import { IsString, IsOptional, IsNumber, MaxLength, Matches } from 'class-validator';
import { CreateCanvasNodeInput } from '@moongatracker/shared-types';

export class CreateNodeDto implements CreateCanvasNodeInput {
  @IsOptional() @IsString() @MaxLength(100000) text?: string;
  @IsNumber() x!: number;
  @IsNumber() y!: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string | null;
}
```
`update-node.dto.ts`:
```typescript
import { IsString, IsOptional, IsNumber, MaxLength, Matches } from 'class-validator';
import { UpdateCanvasNodeInput } from '@moongatracker/shared-types';

export class UpdateNodeDto implements UpdateCanvasNodeInput {
  @IsOptional() @IsString() @MaxLength(100000) text?: string;
  @IsOptional() @IsNumber() x?: number;
  @IsOptional() @IsNumber() y?: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string | null;
}
```
`create-edge.dto.ts`:
```typescript
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { CreateCanvasEdgeInput } from '@moongatracker/shared-types';

export class CreateEdgeDto implements CreateCanvasEdgeInput {
  @IsString() @MinLength(1) sourceNodeId!: string;
  @IsString() @MinLength(1) targetNodeId!: string;
  @IsOptional() @IsString() @MaxLength(200) label?: string | null;
}
```
`update-edge.dto.ts`:
```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { UpdateCanvasEdgeInput } from '@moongatracker/shared-types';

export class UpdateEdgeDto implements UpdateCanvasEdgeInput {
  @IsOptional() @IsString() @MaxLength(200) label?: string | null;
}
```
`create-task-from-node.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';
import { CreateTaskFromNodeInput } from '@moongatracker/shared-types';

export class CreateTaskFromNodeDto implements CreateTaskFromNodeInput {
  @IsString() @MinLength(1) boardId!: string;
}
```
`link-task.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';
import { LinkTaskInput } from '@moongatracker/shared-types';

export class LinkTaskDto implements LinkTaskInput {
  @IsString() @MinLength(1) cardId!: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/canvas/dto
git commit -m "feat(canvas): api DTOs"
```

---

## Task 4: API — CanvasService (+ unit-тесты)

**Files:**
- Create: `apps/api/src/canvas/canvas.service.ts`
- Test: `apps/api/src/canvas/canvas.service.spec.ts`

Доступ раздельный: **чтение** (`getCanvas`) — человек-участник или агент-токен этого проекта; **все мутации** — только человек-участник (`assertMembership`), агент-токен отклоняется.

- [ ] **Step 1: Написать failing-тесты `canvas.service.spec.ts`**

Стиль — мок PrismaService как в `apps/api/src/projects/projects.service.spec.ts`.
```typescript
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { CanvasService } from './canvas.service';

const user = { type: 'user', sub: 'u1' } as any;
const agent = { type: 'agent', projectId: 'p1', tokenId: 't1' } as any;

function makePrisma(overrides: any = {}) {
  return {
    membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    canvasNode: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    canvasEdge: { findMany: jest.fn().mockResolvedValue([]) },
    column: { findFirst: jest.fn() },
    card: { create: jest.fn(), findUnique: jest.fn() },
    board: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(makePrisma(overrides))),
    ...overrides,
  } as any;
}

describe('CanvasService', () => {
  it('getCanvas: агент с токеном этого проекта — допускается', async () => {
    const prisma = makePrisma();
    const svc = new CanvasService(prisma);
    await expect(svc.getCanvas('p1', agent)).resolves.toEqual({ nodes: [], edges: [] });
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it('createNode: агент-токен отклоняется (мутации — только человек)', async () => {
    const prisma = makePrisma();
    const svc = new CanvasService(prisma);
    await expect(
      svc.createNode('p1', { x: 0, y: 0 }, agent),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createTaskFromNode: карточка падает в колонку с минимальным order', async () => {
    const prisma = makePrisma();
    prisma.canvasNode.findUnique.mockResolvedValue({ id: 'n1', projectId: 'p1', cardId: null });
    prisma.board.findUnique.mockResolvedValue({ id: 'b1', projectId: 'p1' });
    prisma.column.findFirst.mockResolvedValue({ id: 'c1', title: 'Идеи', order: 0 });
    prisma.card.create.mockResolvedValue({ id: 'card1', boardId: 'b1', columnId: 'c1', title: 'X', priority: null });
    prisma.canvasNode.update.mockResolvedValue({
      id: 'n1', projectId: 'p1', text: 'X', x: 0, y: 0, width: 240, height: 120,
      color: null, cardId: 'card1', createdAt: new Date(), updatedAt: new Date(),
      card: { id: 'card1', boardId: 'b1', title: 'X', priority: null, column: { title: 'Идеи' } },
    });
    const svc = new CanvasService(prisma);
    const res = await svc.createTaskFromNode('n1', { boardId: 'b1' }, user);
    expect(prisma.column.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { boardId: 'b1' }, orderBy: { order: 'asc' } }),
    );
    expect(res.cardId).toBe('card1');
  });

  it('linkTask: карточка другого проекта — BadRequest', async () => {
    const prisma = makePrisma();
    prisma.canvasNode.findUnique.mockResolvedValue({ id: 'n1', projectId: 'p1', cardId: null });
    prisma.card.findUnique.mockResolvedValue({ id: 'card1', board: { projectId: 'OTHER' }, canvasNode: null });
    const svc = new CanvasService(prisma);
    await expect(svc.linkTask('n1', { cardId: 'card1' }, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('seed: идемпотентен — не сеет, если ноды уже есть', async () => {
    const prisma = makePrisma({ canvasNode: { ...makePrisma().canvasNode, count: jest.fn().mockResolvedValue(3) } });
    const svc = new CanvasService(prisma);
    await svc.seed('p1', user);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx nx test api --testFile=apps/api/src/canvas/canvas.service.spec.ts`
Expected: FAIL — `Cannot find module './canvas.service'`.

- [ ] **Step 3: Реализовать `canvas.service.ts`**

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import {
  CanvasDto,
  CanvasNodeDto,
  CanvasEdgeDto,
  LinkedCardDto,
  CreateCanvasNodeInput,
  UpdateCanvasNodeInput,
  CreateCanvasEdgeInput,
  UpdateCanvasEdgeInput,
} from '@moongatracker/shared-types';

const nodeInclude = { card: { include: { column: true } } } as const;

@Injectable()
export class CanvasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Чтение: участник-человек ИЛИ агент с токеном этого проекта. */
  private async assertRead(user: any, projectId: string): Promise<void> {
    if (user?.type === 'agent') {
      if (user.projectId !== projectId)
        throw new ForbiddenException('Token is not scoped to this project');
      return;
    }
    await assertMembership(this.prisma, user.sub, projectId);
  }

  /** Мутации: только человек-участник. Агент-токен отклоняется (запись — v2). */
  private async assertWrite(user: any, projectId: string): Promise<void> {
    if (user?.type === 'agent')
      throw new ForbiddenException('Agents cannot edit the canvas');
    await assertMembership(this.prisma, user.sub, projectId);
  }

  private async nodeProjectId(nodeId: string): Promise<{ projectId: string; cardId: string | null }> {
    const node = await this.prisma.canvasNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundException(`Canvas node ${nodeId} not found`);
    return { projectId: node.projectId, cardId: node.cardId };
  }

  private toLinkedCard(card: any): LinkedCardDto | null {
    if (!card) return null;
    return {
      id: card.id,
      boardId: card.boardId,
      title: card.title,
      columnTitle: card.column?.title ?? '',
      priority: card.priority ?? null,
    };
  }

  private toNodeDto(n: any): CanvasNodeDto {
    return {
      id: n.id,
      projectId: n.projectId,
      text: n.text,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      color: n.color ?? null,
      cardId: n.cardId ?? null,
      card: this.toLinkedCard(n.card),
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  private toEdgeDto(e: any): CanvasEdgeDto {
    return {
      id: e.id,
      projectId: e.projectId,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      label: e.label ?? null,
    };
  }

  async getCanvas(projectId: string, user: any): Promise<CanvasDto> {
    await this.assertRead(user, projectId);
    const [nodes, edges] = await Promise.all([
      this.prisma.canvasNode.findMany({ where: { projectId }, include: nodeInclude }),
      this.prisma.canvasEdge.findMany({ where: { projectId } }),
    ]);
    return { nodes: nodes.map((n) => this.toNodeDto(n)), edges: edges.map((e) => this.toEdgeDto(e)) };
  }

  async createNode(projectId: string, dto: CreateCanvasNodeInput, user: any): Promise<CanvasNodeDto> {
    await this.assertWrite(user, projectId);
    const node = await this.prisma.canvasNode.create({
      data: {
        projectId,
        text: dto.text ?? '',
        x: dto.x,
        y: dto.y,
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: nodeInclude,
    });
    return this.toNodeDto(node);
  }

  async updateNode(nodeId: string, dto: UpdateCanvasNodeInput, user: any): Promise<CanvasNodeDto> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    const node = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.x !== undefined && { x: dto.x }),
        ...(dto.y !== undefined && { y: dto.y }),
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: nodeInclude,
    });
    return this.toNodeDto(node);
  }

  async removeNode(nodeId: string, user: any): Promise<void> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    await this.prisma.canvasNode.delete({ where: { id: nodeId } });
  }

  async createEdge(projectId: string, dto: CreateCanvasEdgeInput, user: any): Promise<CanvasEdgeDto> {
    await this.assertWrite(user, projectId);
    const [src, tgt] = await Promise.all([
      this.prisma.canvasNode.findUnique({ where: { id: dto.sourceNodeId } }),
      this.prisma.canvasNode.findUnique({ where: { id: dto.targetNodeId } }),
    ]);
    if (!src || !tgt || src.projectId !== projectId || tgt.projectId !== projectId)
      throw new BadRequestException('Both nodes must belong to this project');
    const edge = await this.prisma.canvasEdge.create({
      data: { projectId, sourceNodeId: dto.sourceNodeId, targetNodeId: dto.targetNodeId, label: dto.label ?? null },
    });
    return this.toEdgeDto(edge);
  }

  async updateEdge(edgeId: string, dto: UpdateCanvasEdgeInput, user: any): Promise<CanvasEdgeDto> {
    const edge = await this.prisma.canvasEdge.findUnique({ where: { id: edgeId } });
    if (!edge) throw new NotFoundException(`Canvas edge ${edgeId} not found`);
    await this.assertWrite(user, edge.projectId);
    const updated = await this.prisma.canvasEdge.update({
      where: { id: edgeId },
      data: { ...(dto.label !== undefined && { label: dto.label }) },
    });
    return this.toEdgeDto(updated);
  }

  async removeEdge(edgeId: string, user: any): Promise<void> {
    const edge = await this.prisma.canvasEdge.findUnique({ where: { id: edgeId } });
    if (!edge) throw new NotFoundException(`Canvas edge ${edgeId} not found`);
    await this.assertWrite(user, edge.projectId);
    await this.prisma.canvasEdge.delete({ where: { id: edgeId } });
  }

  async createTaskFromNode(nodeId: string, dto: { boardId: string }, user: any): Promise<CanvasNodeDto> {
    const { projectId, cardId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    if (cardId) throw new BadRequestException('Node is already linked to a task');

    const board = await this.prisma.board.findUnique({ where: { id: dto.boardId } });
    if (!board || board.projectId !== projectId)
      throw new BadRequestException('Board does not belong to this project');

    const node = await this.prisma.canvasNode.findUnique({ where: { id: nodeId } });
    const firstColumn = await this.prisma.column.findFirst({
      where: { boardId: dto.boardId },
      orderBy: { order: 'asc' },
    });
    if (!firstColumn) throw new BadRequestException('Board has no columns');

    const maxCard = await this.prisma.card.aggregate({
      where: { boardId: dto.boardId, columnId: firstColumn.id },
      _max: { order: true },
    });
    const title = (node?.text ?? '').trim().split('\n')[0].slice(0, 200) || 'Без названия';

    const card = await this.prisma.card.create({
      data: {
        boardId: dto.boardId,
        columnId: firstColumn.id,
        title,
        order: (maxCard._max.order ?? -1) + 1,
        authorType: user?.type === 'agent' ? 'agent' : 'user',
        authorId: user?.sub ?? null,
      },
    });
    const updated = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: { cardId: card.id },
      include: nodeInclude,
    });
    return this.toNodeDto(updated);
  }

  async linkTask(nodeId: string, dto: { cardId: string }, user: any): Promise<CanvasNodeDto> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    const card = await this.prisma.card.findUnique({
      where: { id: dto.cardId },
      include: { board: true, canvasNode: true },
    });
    if (!card || card.board.projectId !== projectId)
      throw new BadRequestException('Card does not belong to this project');
    if (card.canvasNode && card.canvasNode.id !== nodeId)
      throw new BadRequestException('Card is already linked to another node');
    const updated = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: { cardId: dto.cardId },
      include: nodeInclude,
    });
    return this.toNodeDto(updated);
  }

  async unlinkTask(nodeId: string, user: any): Promise<CanvasNodeDto> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    const updated = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: { cardId: null },
      include: nodeInclude,
    });
    return this.toNodeDto(updated);
  }

  async seed(projectId: string, user: any): Promise<CanvasDto> {
    await this.assertWrite(user, projectId);
    const count = await this.prisma.canvasNode.count({ where: { projectId } });
    if (count === 0) {
      await this.prisma.$transaction(async (tx) => {
        const a = await tx.canvasNode.create({
          data: { projectId, text: '# Идея\nНачни отсюда — дабл-клик создаёт ноду.', x: 0, y: 0 },
        });
        const b = await tx.canvasNode.create({
          data: { projectId, text: 'Свяжи ноды стрелкой и преврати в задачу.', x: 360, y: 120 },
        });
        await tx.canvasEdge.create({
          data: { projectId, sourceNodeId: a.id, targetNodeId: b.id, label: null },
        });
      });
    }
    return this.getCanvas(projectId, user);
  }
}
```

- [ ] **Step 4: Запустить тесты — зелено**

Run: `npx nx test api --testFile=apps/api/src/canvas/canvas.service.spec.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/canvas/canvas.service.ts apps/api/src/canvas/canvas.service.spec.ts
git commit -m "feat(canvas): CanvasService + unit tests"
```

---

## Task 5: API — контроллер + модуль + регистрация

**Files:**
- Create: `apps/api/src/canvas/canvas.controller.ts`
- Create: `apps/api/src/canvas/canvas.module.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: Контроллер (стиль `wiki.controller.ts`)**

```typescript
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { CanvasDto, CanvasNodeDto, CanvasEdgeDto } from '@moongatracker/shared-types';
import { CanvasService } from './canvas.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { CreateEdgeDto } from './dto/create-edge.dto';
import { UpdateEdgeDto } from './dto/update-edge.dto';
import { CreateTaskFromNodeDto } from './dto/create-task-from-node.dto';
import { LinkTaskDto } from './dto/link-task.dto';

@Controller()
export class CanvasController {
  constructor(private readonly canvas: CanvasService) {}

  @Get('projects/:projectId/canvas')
  get(@Param('projectId') projectId: string, @Req() req: any): Promise<CanvasDto> {
    return this.canvas.getCanvas(projectId, req.user);
  }

  @Post('projects/:projectId/canvas/seed')
  seed(@Param('projectId') projectId: string, @Req() req: any): Promise<CanvasDto> {
    return this.canvas.seed(projectId, req.user);
  }

  @Post('projects/:projectId/canvas/nodes')
  createNode(@Param('projectId') projectId: string, @Body() dto: CreateNodeDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.createNode(projectId, dto, req.user);
  }

  @Patch('canvas/nodes/:nodeId')
  updateNode(@Param('nodeId') nodeId: string, @Body() dto: UpdateNodeDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.updateNode(nodeId, dto, req.user);
  }

  @Delete('canvas/nodes/:nodeId')
  @HttpCode(204)
  removeNode(@Param('nodeId') nodeId: string, @Req() req: any): Promise<void> {
    return this.canvas.removeNode(nodeId, req.user);
  }

  @Post('projects/:projectId/canvas/edges')
  createEdge(@Param('projectId') projectId: string, @Body() dto: CreateEdgeDto, @Req() req: any): Promise<CanvasEdgeDto> {
    return this.canvas.createEdge(projectId, dto, req.user);
  }

  @Patch('canvas/edges/:edgeId')
  updateEdge(@Param('edgeId') edgeId: string, @Body() dto: UpdateEdgeDto, @Req() req: any): Promise<CanvasEdgeDto> {
    return this.canvas.updateEdge(edgeId, dto, req.user);
  }

  @Delete('canvas/edges/:edgeId')
  @HttpCode(204)
  removeEdge(@Param('edgeId') edgeId: string, @Req() req: any): Promise<void> {
    return this.canvas.removeEdge(edgeId, req.user);
  }

  @Post('canvas/nodes/:nodeId/create-task')
  createTask(@Param('nodeId') nodeId: string, @Body() dto: CreateTaskFromNodeDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.createTaskFromNode(nodeId, dto, req.user);
  }

  @Post('canvas/nodes/:nodeId/link-task')
  linkTask(@Param('nodeId') nodeId: string, @Body() dto: LinkTaskDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.linkTask(nodeId, dto, req.user);
  }

  @Delete('canvas/nodes/:nodeId/task')
  unlinkTask(@Param('nodeId') nodeId: string, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.unlinkTask(nodeId, req.user);
  }
}
```

- [ ] **Step 2: Модуль (стиль `wiki.module.ts`)**

`canvas.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { CanvasController } from './canvas.controller';
import { CanvasService } from './canvas.service';

@Module({
  controllers: [CanvasController],
  providers: [CanvasService, PrismaService],
})
export class CanvasModule {}
```

- [ ] **Step 3: Зарегистрировать в `app.module.ts`**

Добавить импорт `import { CanvasModule } from '../canvas/canvas.module';` и `CanvasModule` в массив `imports` (рядом с `WikiModule`).

- [ ] **Step 4: Сборка api**

Run: `npx nx build api`
Expected: успешная сборка.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/canvas/canvas.controller.ts apps/api/src/canvas/canvas.module.ts apps/api/src/app/app.module.ts
git commit -m "feat(canvas): controller + module + register"
```

---

## Task 6: Realtime — soft-lock в EventsGateway (+ тест)

**Files:**
- Modify: `apps/api/src/events/events.gateway.ts`
- Test: `apps/api/src/events/events.gateway.spec.ts`

Модель: один держатель лока на проект в памяти; `canvas:acquire` даёт лок, если свободен или текущий протух (`LOCK_TTL_MS`); `canvas:heartbeat` продлевает; `canvas:release`/`disconnect` снимают; broadcast `canvas:locked`/`canvas:unlocked` в комнату `project:<id>`.

- [ ] **Step 1: Failing-тест `events.gateway.spec.ts`**

```typescript
import { EventsGateway } from './events.gateway';

function client(id: string) {
  return { id, join: jest.fn(), emit: jest.fn() } as any;
}

describe('EventsGateway canvas lock', () => {
  it('acquire даёт лок свободного холста, повторный от другого — отказ', () => {
    const gw = new EventsGateway();
    gw.server = { to: () => ({ emit: jest.fn() }) } as any;
    const a = client('sock-a');
    const r1 = gw.canvasAcquire(a, { projectId: 'p1', userId: 'u1', name: 'A', color: '#f00' });
    expect(r1.ok).toBe(true);
    const b = client('sock-b');
    const r2 = gw.canvasAcquire(b, { projectId: 'p1', userId: 'u2', name: 'B', color: '#0f0' });
    expect(r2.ok).toBe(false);
    expect(r2.holder?.userId).toBe('u1');
  });

  it('release освобождает, после чего другой может взять', () => {
    const gw = new EventsGateway();
    gw.server = { to: () => ({ emit: jest.fn() }) } as any;
    const a = client('sock-a');
    gw.canvasAcquire(a, { projectId: 'p1', userId: 'u1', name: 'A', color: '#f00' });
    gw.canvasRelease(a, { projectId: 'p1' });
    const b = client('sock-b');
    expect(gw.canvasAcquire(b, { projectId: 'p1', userId: 'u2', name: 'B', color: '#0f0' }).ok).toBe(true);
  });

  it('disconnect снимает лок этого сокета', () => {
    const gw = new EventsGateway();
    gw.server = { to: () => ({ emit: jest.fn() }) } as any;
    const a = client('sock-a');
    gw.canvasAcquire(a, { projectId: 'p1', userId: 'u1', name: 'A', color: '#f00' });
    gw.handleDisconnect(a);
    const b = client('sock-b');
    expect(gw.canvasAcquire(b, { projectId: 'p1', userId: 'u2', name: 'B', color: '#0f0' }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npx nx test api --testFile=apps/api/src/events/events.gateway.spec.ts`
Expected: FAIL — `gw.canvasAcquire is not a function`.

- [ ] **Step 3: Расширить `events.gateway.ts`**

```typescript
import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface LockHolder {
  userId: string;
  name: string;
  color: string;
  socketId: string;
  lockedAt: number;
}

const LOCK_TTL_MS = 2 * 60 * 1000;

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** projectId -> текущий держатель лока холста (in-memory, эфемерно). */
  private readonly locks = new Map<string, LockHolder>();

  emitBoardChanged(): void {
    this.server?.emit('board:changed');
  }

  private room(projectId: string): string {
    return `project:${projectId}`;
  }

  private isStale(h: LockHolder): boolean {
    return Date.now() - h.lockedAt > LOCK_TTL_MS;
  }

  @SubscribeMessage('canvas:join')
  canvasJoin(client: Socket, payload: { projectId: string }): { holder: LockHolder | null } {
    client.join(this.room(payload.projectId));
    const h = this.locks.get(payload.projectId);
    return { holder: h && !this.isStale(h) ? h : null };
  }

  @SubscribeMessage('canvas:acquire')
  canvasAcquire(
    client: Socket,
    payload: { projectId: string; userId: string; name: string; color: string },
  ): { ok: boolean; holder: LockHolder | null } {
    const current = this.locks.get(payload.projectId);
    if (current && current.socketId !== client.id && !this.isStale(current)) {
      return { ok: false, holder: current };
    }
    const holder: LockHolder = {
      userId: payload.userId,
      name: payload.name,
      color: payload.color,
      socketId: client.id,
      lockedAt: Date.now(),
    };
    this.locks.set(payload.projectId, holder);
    this.server?.to(this.room(payload.projectId)).emit('canvas:locked', { projectId: payload.projectId, holder });
    return { ok: true, holder };
  }

  @SubscribeMessage('canvas:heartbeat')
  canvasHeartbeat(client: Socket, payload: { projectId: string }): void {
    const h = this.locks.get(payload.projectId);
    if (h && h.socketId === client.id) h.lockedAt = Date.now();
  }

  @SubscribeMessage('canvas:release')
  canvasRelease(client: Socket, payload: { projectId: string }): void {
    const h = this.locks.get(payload.projectId);
    if (h && h.socketId === client.id) {
      this.locks.delete(payload.projectId);
      this.server?.to(this.room(payload.projectId)).emit('canvas:unlocked', { projectId: payload.projectId });
    }
  }

  handleDisconnect(client: Socket): void {
    for (const [projectId, h] of this.locks.entries()) {
      if (h.socketId === client.id) {
        this.locks.delete(projectId);
        this.server?.to(this.room(projectId)).emit('canvas:unlocked', { projectId });
      }
    }
  }
}
```
(Существующий `emitBoardChanged` и его вызов из `BoardEventsInterceptor` не трогаем.)

- [ ] **Step 4: Тесты зелёные**

Run: `npx nx test api --testFile=apps/api/src/events/events.gateway.spec.ts`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/events/events.gateway.ts apps/api/src/events/events.gateway.spec.ts
git commit -m "feat(canvas): soft-lock in EventsGateway"
```

---

## Task 7: MCP — read-only get_canvas

**Files:**
- Create: `apps/mcp/src/tools/get-canvas.ts`
- Modify: `apps/mcp/src/main.ts`

- [ ] **Step 1: Тула (стиль `tools/list-wiki.ts`)**

`get-canvas.ts`:
```typescript
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CanvasDto } from '@moongatracker/shared-types';

export const getCanvasTool: Tool = {
  name: 'get_canvas',
  description: 'Холст проекта: ноды (markdown + позиция + связанная карточка) и связи между ними',
  inputSchema: {
    type: 'object',
    properties: { projectId: { type: 'string' } },
    required: ['projectId'],
  },
};

export async function getCanvas(args: { projectId: string }): Promise<string> {
  const canvas = await apiGet<CanvasDto>(`/api/projects/${args.projectId}/canvas`);
  return JSON.stringify(canvas, null, 2);
}
```

- [ ] **Step 2: Зарегистрировать в `main.ts`**

Добавить импорт `import { getCanvasTool, getCanvas } from './tools/get-canvas.js';`, элемент `getCanvasTool` в массив `tools`, и ветку в `switch`:
```typescript
      case 'get_canvas':
        text = await getCanvas(args as { projectId: string });
        break;
```

- [ ] **Step 3: Сборка mcp**

Run: `npx nx build mcp`
Expected: успешная сборка.

- [ ] **Step 4: Commit**

```bash
git add apps/mcp/src/tools/get-canvas.ts apps/mcp/src/main.ts
git commit -m "feat(canvas): read-only MCP get_canvas tool"
```

---

## Task 8: Web — установка React Flow + API-клиент

**Files:**
- Modify: `package.json` (через установку)
- Create: `apps/web/src/api/canvas.ts`

- [ ] **Step 1: Установить React Flow**

Run: `npm install @xyflow/react`
Expected: добавлен в `dependencies`.

- [ ] **Step 2: API-клиент `apps/web/src/api/canvas.ts` (стиль `api/wiki.ts`)**

```typescript
import { apiFetch, asJson } from './client';
import type {
  CanvasDto,
  CanvasNodeDto,
  CanvasEdgeDto,
} from '@moongatracker/shared-types';

const json = { 'Content-Type': 'application/json' };

export function fetchCanvas(projectId: string): Promise<CanvasDto> {
  return apiFetch(`/api/projects/${projectId}/canvas`).then((r) => asJson<CanvasDto>(r));
}

export function seedCanvas(projectId: string): Promise<CanvasDto> {
  return apiFetch(`/api/projects/${projectId}/canvas/seed`, { method: 'POST' }).then((r) => asJson<CanvasDto>(r));
}

export function createNode(projectId: string, input: { text?: string; x: number; y: number }): Promise<CanvasNodeDto> {
  return apiFetch(`/api/projects/${projectId}/canvas/nodes`, {
    method: 'POST', headers: json, body: JSON.stringify(input),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export function updateNode(
  nodeId: string,
  patch: { text?: string; x?: number; y?: number; width?: number; height?: number; color?: string | null },
): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}`, {
    method: 'PATCH', headers: json, body: JSON.stringify(patch),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export async function deleteNode(nodeId: string): Promise<void> {
  const r = await apiFetch(`/api/canvas/nodes/${nodeId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function createEdge(projectId: string, input: { sourceNodeId: string; targetNodeId: string; label?: string | null }): Promise<CanvasEdgeDto> {
  return apiFetch(`/api/projects/${projectId}/canvas/edges`, {
    method: 'POST', headers: json, body: JSON.stringify(input),
  }).then((r) => asJson<CanvasEdgeDto>(r));
}

export async function deleteEdge(edgeId: string): Promise<void> {
  const r = await apiFetch(`/api/canvas/edges/${edgeId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function createTaskFromNode(nodeId: string, boardId: string): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}/create-task`, {
    method: 'POST', headers: json, body: JSON.stringify({ boardId }),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export function linkTask(nodeId: string, cardId: string): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}/link-task`, {
    method: 'POST', headers: json, body: JSON.stringify({ cardId }),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export function unlinkTask(nodeId: string): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}/task`, { method: 'DELETE' }).then((r) => asJson<CanvasNodeDto>(r));
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json apps/web/src/api/canvas.ts
git commit -m "feat(canvas): web api client + @xyflow/react"
```

---

## Task 9: Web — socket-хук с локом

**Files:**
- Modify: `apps/web/src/api/socket.ts`

- [ ] **Step 1: Добавить `useCanvasSocket`**

В `apps/web/src/api/socket.ts` дополнить **существующий** верхний импорт React до
`import { useEffect, useRef, useState } from 'react';` (не дублировать строку импорта — в файле
уже есть `import { useEffect } from 'react'` для `useBoardSocket`). `QueryClient`, `io`, `socketUrl`
в файле уже есть — переиспользовать их. Затем добавить тип `LockHolder` и хук:
```typescript
export interface LockHolder {
  userId: string;
  name: string;
  color: string;
  lockedAt: number;
}

export interface CanvasSocket {
  holder: LockHolder | null;
  acquire: (me: { userId: string; name: string; color: string }) => Promise<boolean>;
  release: () => void;
  heartbeat: () => void;
}

/** Подписка на изменения холста + управление локом проекта. */
export function useCanvasSocket(
  projectId: string,
  queryClient: QueryClient,
): CanvasSocket {
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [holder, setHolder] = useState<LockHolder | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const socket = io(socketUrl(), { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('canvas:join', { projectId }, (res: { holder: LockHolder | null }) => {
      setHolder(res?.holder ?? null);
    });
    socket.on('board:changed', () => {
      queryClient.invalidateQueries({ queryKey: ['canvas', projectId] });
    });
    socket.on('canvas:locked', (p: { projectId: string; holder: LockHolder }) => {
      if (p.projectId === projectId) setHolder(p.holder);
    });
    socket.on('canvas:unlocked', (p: { projectId: string }) => {
      if (p.projectId === projectId) setHolder(null);
    });
    return () => {
      socket.emit('canvas:release', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, queryClient]);

  return {
    holder,
    acquire: (me) =>
      new Promise((resolve) => {
        socketRef.current?.emit(
          'canvas:acquire',
          { projectId, ...me },
          (res: { ok: boolean; holder: LockHolder | null }) => {
            setHolder(res?.holder ?? null);
            resolve(!!res?.ok);
          },
        );
      }),
    release: () => socketRef.current?.emit('canvas:release', { projectId }),
    heartbeat: () => socketRef.current?.emit('canvas:heartbeat', { projectId }),
  };
}
```
(Если `io`/`socketUrl` объявлены ниже в файле — перенести новый код под них или вынести `socketUrl` выше. Существующий `useBoardSocket` не трогаем.)

- [ ] **Step 2: Сборка web (тип-чек)**

Run: `npx nx build web`
Expected: успешная сборка.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/socket.ts
git commit -m "feat(canvas): useCanvasSocket with lock"
```

---

## Task 10: Web — страница холста (React Flow)

**Files:**
- Create: `apps/web/src/pages/canvas.tsx`
- Create: `apps/web/src/components/canvas/markdown-node.tsx`

Это самый объёмный таск. Реализуем поэтапно. Лок: по умолчанию read-only; кнопка «Редактировать» зовёт `acquire`; в режиме редактирования интерактив включён, идёт `heartbeat` каждые 30с; при `holder` другого пользователя — read-only + баннер.

- [ ] **Step 1: Кастомная нода `components/canvas/markdown-node.tsx`**

Рендерит markdown (как в `pages/wiki.tsx` — `ReactMarkdown` + `remarkGfm`, классы `MD_CLASSES` можно вынести в общий модуль или продублировать), бейдж связанной задачи, ручки React Flow. Данные ноды приходят в `data`.
```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { LinkedCardDto } from '@moongatracker/shared-types';

export interface MarkdownNodeData {
  text: string;
  color: string | null;
  card: LinkedCardDto | null;
  editable: boolean;
  onOpenCard: (card: LinkedCardDto) => void;
}

export function MarkdownNode({ data }: NodeProps & { data: MarkdownNodeData }) {
  return (
    <div
      className="rounded-md border bg-card p-3 shadow-sm text-sm"
      style={{ borderColor: data.color ?? undefined, width: '100%', height: '100%' }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.text || '_пусто_'}</ReactMarkdown>
      </div>
      {data.card && (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
          onClick={(e) => { e.stopPropagation(); data.onOpenCard(data.card!); }}
        >
          🗂 {data.card.title} · {data.card.columnTitle}
        </button>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

- [ ] **Step 2: Страница `pages/canvas.tsx` — каркас данных + лок-баннер (read-only)**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow, Background, Controls, MiniMap,
  applyNodeChanges, type Node, type Edge, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { getCurrentUserId } from '../api/client';
import { useCanvasSocket } from '../api/socket';
import {
  fetchCanvas, seedCanvas, createNode, updateNode, deleteNode,
  createEdge, deleteEdge,
} from '../api/canvas';
import { MarkdownNode, type MarkdownNodeData } from '../components/canvas/markdown-node';
import type { LinkedCardDto } from '@moongatracker/shared-types';

const nodeTypes = { markdown: MarkdownNode };

export function CanvasPage() {
  const [, params] = useRoute('/projects/:projectId/canvas');
  const projectId = params?.projectId ?? '';
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const myId = getCurrentUserId();

  const { holder, acquire, release, heartbeat } = useCanvasSocket(projectId, queryClient);
  const [editing, setEditing] = useState(false);

  const lockedByOther = !!holder && holder.userId !== myId;
  const lockStale = !!holder && Date.now() - holder.lockedAt > 2 * 60 * 1000;
  const canEdit = editing && !lockedByOther;

  const { data, isLoading } = useQuery({
    queryKey: ['canvas', projectId],
    queryFn: () => fetchCanvas(projectId),
    enabled: !!projectId,
  });

  // первичный seed, если пусто
  useEffect(() => {
    if (data && data.nodes.length === 0) {
      seedCanvas(projectId).then(() => queryClient.invalidateQueries({ queryKey: ['canvas', projectId] }));
    }
  }, [data, projectId, queryClient]);

  // heartbeat в режиме редактирования
  useEffect(() => {
    if (!canEdit) return;
    const t = setInterval(heartbeat, 30000);
    return () => clearInterval(t);
  }, [canEdit, heartbeat]);

  const openCard = useCallback((card: LinkedCardDto) => {
    navigate(`/boards/${card.boardId}/cards/${card.id}`);
  }, [navigate]);

  const rfNodes: Node[] = useMemo(
    () => (data?.nodes ?? []).map((n) => ({
      id: n.id,
      type: 'markdown',
      position: { x: n.x, y: n.y },
      width: n.width,
      height: n.height,
      draggable: canEdit,
      data: { text: n.text, color: n.color, card: n.card, editable: canEdit, onOpenCard: openCard } as MarkdownNodeData,
    })),
    [data, canEdit, openCard],
  );
  const rfEdges: Edge[] = useMemo(
    () => (data?.edges ?? []).map((e) => ({ id: e.id, source: e.sourceNodeId, target: e.targetNodeId, label: e.label ?? undefined })),
    [data],
  );

  const onEdit = async () => {
    if (!myId) return;
    const ok = await acquire({ userId: myId, name: 'Вы', color: '#2563eb' });
    setEditing(ok);
  };
  const onDone = () => { release(); setEditing(false); };

  if (isLoading) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-2">
        <h1 className="text-sm font-semibold">Холст</h1>
        <div className="ml-auto flex items-center gap-2">
          {lockedByOther && !lockStale && (
            <span className="rounded px-2 py-1 text-xs text-white" style={{ background: holder!.color }}>
              {holder!.name} редактирует
            </span>
          )}
          {!editing ? (
            <Button size="sm" onClick={onEdit} disabled={lockedByOther && !lockStale}>
              {lockedByOther && lockStale ? 'Перехватить' : 'Редактировать'}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={onDone}>Готово</Button>
          )}
        </div>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable
          fitView
          onNodeDragStop={(_, node) => { if (canEdit) updateNode(node.id, { x: node.position.x, y: node.position.y }); }}
          onConnect={(c) => { if (canEdit && c.source && c.target) createEdge(projectId, { sourceNodeId: c.source, targetNodeId: c.target }).then(() => queryClient.invalidateQueries({ queryKey: ['canvas', projectId] })); }}
          onPaneClick={(e) => {
            if (!canEdit) return;
            if ((e as any).detail === 2) {
              createNode(projectId, { x: (e as any).clientX - 200, y: (e as any).clientY - 100, text: 'Новая нода' })
                .then(() => queryClient.invalidateQueries({ queryKey: ['canvas', projectId] }));
            }
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
```
> Примечание: `onPaneClick` детектит дабл-клик грубо; при необходимости заменить на `onDoubleClick` контейнера с проекцией координат через `useReactFlow().screenToFlowPosition`. Координаты создания — упрощены; уточнить при ручной проверке.

- [ ] **Step 3: Сборка web**

Run: `npx nx build web`
Expected: успешная сборка (тип-чек проходит).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/canvas.tsx apps/web/src/components/canvas/markdown-node.tsx
git commit -m "feat(canvas): React Flow canvas page with lock"
```

---

## Task 11: Web — роут + ссылка в сайдбаре + диалоги задач

**Files:**
- Modify: `apps/web/src/app/app.tsx`
- Modify: `apps/web/src/components/layout/sidebar.tsx`
- Modify: `apps/web/src/pages/canvas.tsx` (диалоги «создать/привязать задачу»)

- [ ] **Step 1: Роут в `app.tsx`**

Добавить импорт `import { CanvasPage } from '../pages/canvas';` и `<Route path="/projects/:projectId/canvas" component={CanvasPage} />` рядом с роутом вики.

- [ ] **Step 2: Ссылка «Холст» в сайдбаре**

В `apps/web/src/components/layout/sidebar.tsx` рядом с пунктом «Вики» добавить ссылку на `/projects/${projectId}/canvas` с подписью «Холст» (повторить разметку соседнего пункта).

- [ ] **Step 3: Диалоги задач на ноде**

В `canvas.tsx` добавить в `MarkdownNodeData` колбэки `onCreateTask`/`onLinkTask` и кнопки в `MarkdownNode` (видны при `editable`). «Создать задачу» открывает `Select` доски (список — `fetchBoards(projectId)` из `api/boards`), затем `createTaskFromNode(nodeId, boardId)`. «Привязать» — выбор карточки проекта (по доскам), затем `linkTask`. После успеха — `invalidateQueries(['canvas', projectId])`. UI-компоненты — из `components/ui` (Dialog/Select), как в `pages/settings.tsx`.

- [ ] **Step 4: Сборка web**

Run: `npx nx build web`
Expected: успешная сборка.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app.tsx apps/web/src/components/layout/sidebar.tsx apps/web/src/pages/canvas.tsx
git commit -m "feat(canvas): route, sidebar link, task dialogs"
```

---

## Task 12: Проверка всего среза

- [ ] **Step 1: Сборки и тесты**

Run:
```bash
npx nx test api
npx nx build api && npx nx build web && npx nx build mcp && npx nx build shared-types
```
Expected: тесты зелёные; все сборки успешны. (Предсуществующие, не связанные с холстом, поломки `web:typecheck`/`data-access:test` — не чинить, см. отчёт по фиче цветов.)

- [ ] **Step 2: E2E вручную (`npx nx serve`)**

- Открыть `/projects/:id/canvas` → засеялось демо (2 ноды + стрелка), повторный заход не дублирует.
- «Редактировать» → дабл-клик создаёт ноду; правка markdown; протянуть стрелку; перетащить ноду — позиция сохраняется (рефреш не теряет).
- «Создать задачу» из ноды → выбрать доску → карточка в первой колонке; на ноде бейдж; клик ведёт на `/boards/:boardId/cards/:cardId`.
- «Привязать существующую» → бейдж; «отвязать» → нода снова обычная.
- Удалить карточку на канбане → нода осталась, бейдж пропал.
- Лок: вкладка A «Редактировать» → у вкладки B read-only + баннер «… редактирует»; A закрывает вкладку → у B лок снят; A «завис» → у B через ~2 мин «Перехватить».

- [ ] **Step 3: Финальный commit (если остались мелкие правки после ручной проверки)**

```bash
git add -A
git commit -m "test(canvas): manual E2E fixes"
```

---

## Notes / открытые места для исполнителя
- **Координаты создания ноды** в `onPaneClick` упрощены — при ручной проверке заменить на `useReactFlow().screenToFlowPosition({ x, y })` и обернуть страницу в `ReactFlowProvider`, если потребуется доступ к инстансу.
- **MD_CLASSES**: можно вынести из `pages/wiki.tsx` в общий `components/markdown/md-classes.ts` и переиспользовать в ноде (DRY), либо продублировать минимальный набор — на усмотрение, без расширения скоупа.
- **Дебаунс позиции**: `onNodeDragStop` шлёт PATCH по завершении drag (этого достаточно; промежуточный дебаунс не нужен).
- Расширения с расширением `.js` в импортах shared-libs — следовать существующим файлам.
