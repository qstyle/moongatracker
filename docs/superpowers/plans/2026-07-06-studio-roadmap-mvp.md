# Studio Roadmap Tab MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-project "Роадмап" tab: an editable default stage pipeline (Идея→Прод) where each stage can spawn boards.

**Architecture:** New `Stage` model (6 editable defaults seeded per project) + nullable `Board.stageId`. A `stages` NestJS module mirrors the existing `columns` module (list/create/seed/reorder/update/delete). Board creation gains an optional `stageId`. A new web page renders the stage pipeline; each stage lists its boards and can create one.

**Tech Stack:** NestJS + Prisma (Postgres), React + Vite + wouter + react-query, shared-types lib.

Spec: `docs/superpowers/specs/2026-07-06-studio-roadmap-mvp-design.md`.

---

### Task 1: Prisma `Stage` model + `Board.stageId` + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260706120000_stages/migration.sql`

- [ ] **Step 1: Add the relation + model to `prisma/schema.prisma`.** On `Project`, add `stages Stage[]`. On `Board`, add `stageId String?` and `stage Stage? @relation(fields: [stageId], references: [id], onDelete: SetNull)`. Add:

```prisma
model Stage {
  id        String   @id @default(cuid())
  projectId String
  key       String?
  title     String
  order     Int
  status    String   @default("not_started")
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  boards    Board[]

  @@index([projectId])
}
```

- [ ] **Step 2: Write the migration SQL** at `prisma/migrations/20260706120000_stages/migration.sql`:

```sql
-- Roadmap stages per project + optional board→stage link.
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Stage_projectId_idx" ON "Stage"("projectId");
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Board" ADD COLUMN "stageId" TEXT;
ALTER TABLE "Board" ADD CONSTRAINT "Board_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply to local DB, record, regenerate client.**

Run:
```bash
npx prisma db execute --file prisma/migrations/20260706120000_stages/migration.sql
npx prisma migrate resolve --applied 20260706120000_stages
npx prisma generate
```
Expected: "Script executed successfully", "marked as applied", "Generated Prisma Client".

- [ ] **Step 4: Commit.**
```bash
git add prisma/schema.prisma prisma/migrations/20260706120000_stages
git commit -m "feat(db): Stage model + Board.stageId (РАЗР1-29)"
```

---

### Task 2: shared-types — `StageDto` + `BoardSummaryDto.stageId`

**Files:**
- Create: `libs/shared-types/src/lib/stage.ts`
- Modify: `libs/shared-types/src/index.ts`, `libs/shared-types/src/lib/board.ts`

- [ ] **Step 1: Create `libs/shared-types/src/lib/stage.ts`:**

```ts
import { BoardSummaryDto } from './board.js';

export type StageStatus = 'not_started' | 'active' | 'done';

export interface StageDto {
  id: string;
  projectId: string;
  key: string | null;
  title: string;
  order: number;
  status: StageStatus;
  boards: BoardSummaryDto[];
}
```

- [ ] **Step 2: Add `stageId` to `BoardSummaryDto`** in `libs/shared-types/src/lib/board.ts` (find the interface; add `stageId: string | null;`).

- [ ] **Step 3: Export** in `libs/shared-types/src/index.ts`: add `export * from './lib/stage.js';`.

- [ ] **Step 4: Commit.**
```bash
git add libs/shared-types/src
git commit -m "feat(types): StageDto + BoardSummaryDto.stageId"
```

---

### Task 3: Seed default stages on project creation

**Files:**
- Create: `apps/api/src/stages/default-stages.ts`
- Modify: `apps/api/src/projects/projects.service.ts`, `apps/api/src/auth/auth.service.ts`

- [ ] **Step 1: Create `apps/api/src/stages/default-stages.ts`:**

```ts
const DEFAULT_STAGES = [
  { key: 'idea', title: 'Идея' },
  { key: 'validate', title: 'Валидация' },
  { key: 'design', title: 'Дизайн' },
  { key: 'build', title: 'Разработка' },
  { key: 'launch', title: 'Запуск' },
  { key: 'prod', title: 'Прод' },
];

/** Rows for prisma.stage.createMany — first stage is active. */
export function buildDefaultStages(projectId: string) {
  return DEFAULT_STAGES.map((s, i) => ({
    projectId,
    key: s.key,
    title: s.title,
    order: i,
    status: i === 0 ? 'active' : 'not_started',
  }));
}
```

- [ ] **Step 2: Seed in `ProjectsService.create`** (`apps/api/src/projects/projects.service.ts`). Import `buildDefaultStages` and inside the `$transaction`, after `tx.project.create`, add `await tx.stage.createMany({ data: buildDefaultStages(created.id) });`.

- [ ] **Step 3: Seed in `AuthService.register`** (`apps/api/src/auth/auth.service.ts`). Import `buildDefaultStages`; inside the transaction that creates the project, after `tx.project.create(...)` add `await tx.stage.createMany({ data: buildDefaultStages(user...projectId) });` (use the created project's id).

- [ ] **Step 4: Build to typecheck.** Run `npx nx build api`. Expected: success.

- [ ] **Step 5: Commit.**
```bash
git add apps/api/src/stages/default-stages.ts apps/api/src/projects/projects.service.ts apps/api/src/auth/auth.service.ts
git commit -m "feat(api): seed default stages on project creation"
```

---

### Task 4: `StagesService` + unit tests

**Files:**
- Create: `apps/api/src/stages/stages.service.ts`, `apps/api/src/stages/stage.mapper.ts`, `apps/api/src/stages/stages.service.spec.ts`

- [ ] **Step 1: Create `apps/api/src/stages/stage.mapper.ts`:**

```ts
import { BoardSummaryDto, StageDto, StageStatus } from '@moongatracker/shared-types';

type BoardRow = { id: string; projectId: string; name: string; seq: number; stageId: string | null; createdAt: Date };
type StageRow = { id: string; projectId: string; key: string | null; title: string; order: number; status: string; boards?: BoardRow[] };

export function toBoardSummary(b: BoardRow): BoardSummaryDto {
  return { id: b.id, projectId: b.projectId, name: b.name, seq: b.seq, stageId: b.stageId, createdAt: b.createdAt.toISOString() };
}

export function toStageDto(s: StageRow): StageDto {
  return {
    id: s.id, projectId: s.projectId, key: s.key, title: s.title, order: s.order,
    status: s.status as StageStatus,
    boards: (s.boards ?? []).map(toBoardSummary),
  };
}
```

- [ ] **Step 2: Write the failing test** `apps/api/src/stages/stages.service.spec.ts`:

```ts
import { StagesService } from './stages.service';

function make(over: any = {}) {
  const prisma: any = {
    membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
    stage: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ id: 's1', projectId: 'p1' }),
      aggregate: jest.fn().mockResolvedValue({ _max: { order: 2 } }),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 's9', boards: [], ...data })),
      createMany: jest.fn().mockResolvedValue({ count: 6 }),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 's1', projectId: 'p1', key: null, title: 't', order: 0, status: 'not_started', boards: [], ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({}),
    },
    ...over,
  };
  return { svc: new StagesService(prisma), prisma };
}

describe('StagesService', () => {
  it('create() appends after the max order', async () => {
    const { svc, prisma } = make();
    const s = await svc.create('p1', 'X', 'u1');
    expect(prisma.stage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ order: 3, title: 'X', projectId: 'p1' }) }));
    expect(s.title).toBe('X');
  });

  it('seedDefaults() is a no-op when stages already exist', async () => {
    const { svc, prisma } = make();
    prisma.stage.count.mockResolvedValue(6);
    await svc.seedDefaults('p1', 'u1');
    expect(prisma.stage.createMany).not.toHaveBeenCalled();
  });

  it('seedDefaults() seeds 6 when empty', async () => {
    const { svc, prisma } = make();
    prisma.stage.count.mockResolvedValue(0);
    await svc.seedDefaults('p1', 'u1');
    expect(prisma.stage.createMany).toHaveBeenCalled();
  });

  it('remove() deletes the stage (boards detach via FK SetNull)', async () => {
    const { svc, prisma } = make();
    await svc.remove('s1', 'u1');
    expect(prisma.stage.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });
});
```

- [ ] **Step 3: Run to verify it fails.** Run `npx nx test api --testFile=stages.service.spec.ts` (or `npx nx test api`). Expected: FAIL (module not found).

- [ ] **Step 4: Create `apps/api/src/stages/stages.service.ts`:**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import { StageDto } from '@moongatracker/shared-types';
import { buildDefaultStages } from './default-stages';
import { toStageDto } from './stage.mapper';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(projectId: string, userId: string): Promise<StageDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const stages = await this.prisma.stage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: { boards: { orderBy: { createdAt: 'asc' } } },
    });
    return stages.map(toStageDto);
  }

  async create(projectId: string, title: string, userId: string): Promise<StageDto> {
    await assertMembership(this.prisma, userId, projectId);
    const max = await this.prisma.stage.aggregate({ where: { projectId }, _max: { order: true } });
    const stage = await this.prisma.stage.create({
      data: { projectId, title, order: (max._max.order ?? -1) + 1 },
      include: { boards: true },
    });
    return toStageDto(stage);
  }

  async seedDefaults(projectId: string, userId: string): Promise<StageDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const count = await this.prisma.stage.count({ where: { projectId } });
    if (count === 0) {
      await this.prisma.stage.createMany({ data: buildDefaultStages(projectId) });
    }
    return this.listForProject(projectId, userId);
  }

  async reorder(projectId: string, orderedIds: string[], userId: string): Promise<void> {
    await assertMembership(this.prisma, userId, projectId);
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.stage.updateMany({ where: { id, projectId }, data: { order: index } }),
      ),
    );
  }

  async update(stageId: string, userId: string, input: { title?: string; status?: string }): Promise<StageDto> {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    await assertMembership(this.prisma, userId, stage.projectId);
    const updated = await this.prisma.stage.update({
      where: { id: stageId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: { boards: { orderBy: { createdAt: 'asc' } } },
    });
    return toStageDto(updated);
  }

  async remove(stageId: string, userId: string): Promise<void> {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    await assertMembership(this.prisma, userId, stage.projectId);
    await this.prisma.stage.delete({ where: { id: stageId } });
  }
}
```

- [ ] **Step 5: Run tests.** Run `npx nx test api`. Expected: PASS.

- [ ] **Step 6: Commit.**
```bash
git add apps/api/src/stages
git commit -m "feat(api): StagesService + tests"
```

---

### Task 5: `StagesController` + DTOs + module + app wiring

**Files:**
- Create: `apps/api/src/stages/stages.controller.ts`, `apps/api/src/stages/stages.module.ts`, `apps/api/src/stages/dto/create-stage.dto.ts`, `apps/api/src/stages/dto/update-stage.dto.ts`, `apps/api/src/stages/dto/reorder-stages.dto.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: DTOs.**
`create-stage.dto.ts`:
```ts
import { IsString, MaxLength, MinLength } from 'class-validator';
export class CreateStageDto {
  @IsString() @MinLength(1) @MaxLength(60) title!: string;
}
```
`update-stage.dto.ts`:
```ts
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class UpdateStageDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60) title?: string;
  @IsOptional() @IsIn(['not_started', 'active', 'done']) status?: string;
}
```
`reorder-stages.dto.ts`:
```ts
import { IsArray, IsString } from 'class-validator';
export class ReorderStagesDto {
  @IsString() projectId!: string;
  @IsArray() @IsString({ each: true }) orderedIds!: string[];
}
```

- [ ] **Step 2: Controller** `apps/api/src/stages/stages.controller.ts` (mirror `columns.controller.ts`; note reorder BEFORE `:id`):

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Request } from '@nestjs/common';
import { StageDto } from '@moongatracker/shared-types';
import { StagesService } from './stages.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

@Controller()
export class StagesController {
  constructor(private readonly stages: StagesService) {}

  @Get('projects/:projectId/stages')
  list(@Param('projectId') projectId: string, @Request() req: { user: { sub: string } }): Promise<StageDto[]> {
    return this.stages.listForProject(projectId, req.user.sub);
  }

  @Post('projects/:projectId/stages')
  create(@Param('projectId') projectId: string, @Body() dto: CreateStageDto, @Request() req: { user: { sub: string } }): Promise<StageDto> {
    return this.stages.create(projectId, dto.title, req.user.sub);
  }

  @Post('projects/:projectId/stages/seed-defaults')
  seed(@Param('projectId') projectId: string, @Request() req: { user: { sub: string } }): Promise<StageDto[]> {
    return this.stages.seedDefaults(projectId, req.user.sub);
  }

  @Patch('stages/reorder')
  reorder(@Body() dto: ReorderStagesDto, @Request() req: { user: { sub: string } }): Promise<void> {
    return this.stages.reorder(dto.projectId, dto.orderedIds, req.user.sub);
  }

  @Patch('stages/:id')
  update(@Param('id') id: string, @Body() dto: UpdateStageDto, @Request() req: { user: { sub: string } }): Promise<StageDto> {
    return this.stages.update(id, req.user.sub, dto);
  }

  @Delete('stages/:id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req: { user: { sub: string } }): Promise<void> {
    return this.stages.remove(id, req.user.sub);
  }
}
```

- [ ] **Step 3: Module** `apps/api/src/stages/stages.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';

@Module({ controllers: [StagesController], providers: [PrismaService, StagesService] })
export class StagesModule {}
```

- [ ] **Step 4: Register** `StagesModule` in `apps/api/src/app/app.module.ts` imports (next to `ColumnsModule`).

- [ ] **Step 5: Build + test.** Run `npx nx build api && npx nx test api`. Expected: success.

- [ ] **Step 6: Commit.**
```bash
git add apps/api/src/stages apps/api/src/app/app.module.ts
git commit -m "feat(api): stages controller + module"
```

---

### Task 6: Board creation accepts `stageId`; board DTOs expose it

**Files:**
- Modify: `apps/api/src/boards/dto/create-board.dto.ts`, `apps/api/src/boards/boards.service.ts`, `apps/api/src/boards/boards.controller.ts`

- [ ] **Step 1: Add `stageId` to `CreateBoardDto`:**
```ts
@IsOptional() @IsString() stageId?: string;
```
(add `IsOptional`, `IsString` imports if missing.)

- [ ] **Step 2: `BoardsService.create` signature** — add `stageId?: string | null`. Validate it belongs to the project, then write it. In the mapper add `stageId`. Concretely: after `assertProjectAccess`, if `stageId` set, `const stage = await this.prisma.stage.findFirst({ where: { id: stageId, projectId } }); if (!stage) throw new NotFoundException('Stage not found in project');`. Pass `stageId: stageId ?? null` into `tx.board.create({ data: { projectId, name, seq, stageId: stageId ?? null } })`. Add `stageId: board.stageId` to the returned object.

- [ ] **Step 3: Update `listForProject` + `update` return mappers** in `boards.service.ts` to include `stageId: b.stageId`.

- [ ] **Step 4: Controller** — pass `dto.stageId` to `this.boards.create(projectId, dto.name, req.user, dto.stageId)`.

- [ ] **Step 5: Build + test.** Run `npx nx build api && npx nx test api`. Expected: success. (If existing board tests assert exact objects, add `stageId: null` there.)

- [ ] **Step 6: Commit.**
```bash
git add apps/api/src/boards
git commit -m "feat(api): create board within a stage (stageId)"
```

---

### Task 7: Web API client

**Files:**
- Create: `apps/web/src/api/stages.ts`
- Modify: `apps/web/src/api/boards.ts`

- [ ] **Step 1: `apps/web/src/api/stages.ts`:**
```ts
import { apiFetch, asJson } from './client';
import type { StageDto } from '@moongatracker/shared-types';

export function fetchStages(projectId: string): Promise<StageDto[]> {
  return apiFetch(`/api/projects/${projectId}/stages`).then((r) => asJson<StageDto[]>(r));
}
export function seedDefaultStages(projectId: string): Promise<StageDto[]> {
  return apiFetch(`/api/projects/${projectId}/stages/seed-defaults`, { method: 'POST' }).then((r) => asJson<StageDto[]>(r));
}
export function createStage(projectId: string, title: string): Promise<StageDto> {
  return apiFetch(`/api/projects/${projectId}/stages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) }).then((r) => asJson<StageDto>(r));
}
export function updateStage(stageId: string, patch: { title?: string; status?: string }): Promise<StageDto> {
  return apiFetch(`/api/stages/${stageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then((r) => asJson<StageDto>(r));
}
export async function deleteStage(stageId: string): Promise<void> {
  const r = await apiFetch(`/api/stages/${stageId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}
```

- [ ] **Step 2: `createBoard` gains optional `stageId`** in `apps/web/src/api/boards.ts` — add param and include in POST body.

- [ ] **Step 3: Commit.**
```bash
git add apps/web/src/api/stages.ts apps/web/src/api/boards.ts
git commit -m "feat(web): stages api client + createBoard stageId"
```

---

### Task 8: Roadmap page + route + sidebar link

**Files:**
- Create: `apps/web/src/pages/roadmap.tsx`
- Modify: `apps/web/src/app/app.tsx`, `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: `apps/web/src/pages/roadmap.tsx`** — read stages via react-query; render the pipeline. Each stage card: title, status badge, its boards (links to `/boards/:id`), a "＋ Создать доску" button (calls `createBoard(projectId, name, stage.id)` then invalidates), inline add-stage, delete-stage, and "Продвинуть" (PATCH active→done, next→active). Empty state → "Создать стадии по умолчанию" → `seedDefaultStages`.

```tsx
import { useState } from 'react';
import { useRoute } from 'wouter';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchStages, createStage, updateStage, deleteStage, seedDefaultStages } from '../api/stages';
import { createBoard } from '../api/boards';

export function RoadmapPage() {
  const [, params] = useRoute('/projects/:projectId/roadmap');
  const projectId = params?.projectId ?? '';
  const qc = useQueryClient();
  const { data: stages = [], isLoading } = useQuery({ queryKey: ['stages', projectId], queryFn: () => fetchStages(projectId), enabled: !!projectId });
  const [newStage, setNewStage] = useState('');
  const [addingBoardFor, setAddingBoardFor] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['stages', projectId] }); qc.invalidateQueries({ queryKey: ['boards', projectId] }); };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">загрузка…</div>;

  if (stages.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-sm space-y-3 rounded border border-border/60 bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">У проекта пока нет роадмапа.</div>
          <Button onClick={async () => { await seedDefaultStages(projectId); invalidate(); }}>Создать стадии по умолчанию</Button>
        </div>
      </div>
    );
  }

  async function advance(stageId: string) {
    const idx = stages.findIndex((s) => s.id === stageId);
    await updateStage(stageId, { status: 'done' });
    if (stages[idx + 1]) await updateStage(stages[idx + 1].id, { status: 'active' });
    invalidate();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 text-sm font-semibold uppercase tracking-wider">Роадмап</div>
      <div className="flex flex-col gap-3">
        {stages.map((s) => (
          <div key={s.id} className={['rounded border p-4', s.status === 'active' ? 'border-primary' : 'border-border/60'].join(' ')}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="font-medium text-foreground">{s.title}</div>
                <span className="text-xs text-muted-foreground">{s.status === 'active' ? '● текущая' : s.status === 'done' ? '✓ пройдена' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {s.status === 'active' && <Button size="sm" variant="outline" onClick={() => advance(s.id)}>Продвинуть</Button>}
                <Button size="sm" variant="ghost" onClick={async () => { await deleteStage(s.id); invalidate(); }}>Удалить</Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.boards.map((b) => (
                <Link key={b.id} href={`/boards/${b.id}`} className="rounded border border-border bg-muted px-2 py-1 text-sm hover:underline">{b.name}</Link>
              ))}
              {addingBoardFor === s.id ? (
                <span className="flex items-center gap-1">
                  <Input autoFocus value={boardName} placeholder="Доска" className="h-8 w-40" onChange={(e) => setBoardName(e.target.value)}
                    onKeyDown={async (e) => { if (e.key === 'Enter' && boardName.trim()) { await createBoard(projectId, boardName.trim(), s.id); setBoardName(''); setAddingBoardFor(null); invalidate(); } if (e.key === 'Escape') { setBoardName(''); setAddingBoardFor(null); } }} />
                </span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setAddingBoardFor(s.id)}>＋ Создать доску</Button>
              )}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input value={newStage} placeholder="Новая стадия" className="h-8 w-52" onChange={(e) => setNewStage(e.target.value)}
            onKeyDown={async (e) => { if (e.key === 'Enter' && newStage.trim()) { await createStage(projectId, newStage.trim()); setNewStage(''); invalidate(); } }} />
          <Button size="sm" disabled={!newStage.trim()} onClick={async () => { await createStage(projectId, newStage.trim()); setNewStage(''); invalidate(); }}>Добавить стадию</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register route** in `apps/web/src/app/app.tsx` — add `<Route path="/projects/:projectId/roadmap" component={RoadmapPage} />` (import it), following the existing wiki/canvas routes.

- [ ] **Step 3: Sidebar link** in `apps/web/src/components/layout/sidebar.tsx` `ProjectSection` — add a "Роадмап" `Link` to `/projects/${project.id}/roadmap` before the "Вики" link, with `useRoute` active check, mirroring the Вики/Холст links. Use an icon e.g. `RiRouteLine` (import from `@remixicon/react`).

- [ ] **Step 4: Build.** Run `npx nx build web`. Expected: success.

- [ ] **Step 5: Commit.**
```bash
git add apps/web/src/pages/roadmap.tsx apps/web/src/app/app.tsx apps/web/src/components/layout/sidebar.tsx
git commit -m "feat(web): roadmap tab (stage pipeline + board-per-stage)"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1:** `npx nx test api` (all green) and `npx nx build web`.
- [ ] **Step 2:** Start api+web; register a fresh account; open a project → sidebar shows «Роадмап» → 6 stages, «Идея» active.
- [ ] **Step 3:** From «Валидация» create a board → appears under the stage; click → board opens.
- [ ] **Step 4:** Add / rename / delete a stage; delete a stage that has a board → board survives (check via boards list / sidebar).
- [ ] **Step 5:** «Продвинуть» on active stage → it becomes done, next becomes active.
- [ ] **Step 6:** Live curl check (script) for `GET /projects/:id/stages` (6 defaults), create-board-with-stageId, delete-stage-keeps-board.
- [ ] **Step 7:** Merge branch to main.

---

## Notes for execution
- Local dev DB drifts from migration history (missing `ApiToken.userId`) → agent-token minting fails locally; verify with **user** actors (register), not agent tokens.
- Each task ends with its own commit on a feature branch `feat/studio-roadmap-mvp`; merge to main at the end (matches repo flow).
