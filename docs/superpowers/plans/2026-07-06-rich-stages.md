# Rich Roadmap Stages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn roadmap stages into a helpful scaffold — redefine the 5 default stages, and add "Развернуть этап" which provisions a board + template backlog + a stage-scoped wiki section (with recommended tools & links); done stages collapse into a "История" block.

**Architecture:** Backend adds `WikiSection.stageId` and a `StagesService.scaffold` that transactionally seeds a board (default columns), template cards, and a stage wiki section+pages from a static `STAGE_TEMPLATES` data module. Frontend adds a per-stage "Развернуть этап" action, an exit-criteria hint on "Продвинуть", and client-side grouping of `done` stages into a collapsible history block. Gates are advisory (no proposals).

**Tech Stack:** NestJS + Prisma (apps/api), React + wouter + react-query (apps/web), `@moonga-studio/shared-types`, jest.

---

## File Structure
- `apps/api/src/stages/default-stages.ts` — redefine to 5 stages.
- `apps/api/src/stages/stage-templates.ts` (new) — `StageKey`, `StageTemplate`, `STAGE_TEMPLATES`, `STAGE_EXIT_CRITERIA`.
- `apps/api/src/stages/stages.service.ts` — add `scaffold`; `stages.controller.ts` — add scaffold route.
- `prisma/schema.prisma` — `WikiSection.stageId String?` + migration.
- `apps/web/src/api/stages.ts` — `scaffoldStage`.
- `apps/web/src/pages/roadmap.tsx` — "Развернуть этап" button, exit-criteria hint, history grouping.
- `libs/shared-types/src/lib/stage.ts` — add exit-criteria to StageDto? No — keep criteria client/consts. (No shared-type change needed.)

---

## Task 1: Redefine the 5 default stages

**Files:** Modify `apps/api/src/stages/default-stages.ts`; Modify `apps/web/src/pages/roadmap.tsx` (STAGE_ICONS); Test: `apps/api/src/stages/*.spec.ts` if stage count asserted.

- [ ] **Step 1: Replace DEFAULT_STAGES**

```ts
const DEFAULT_STAGES = [
  { key: 'discovery', title: 'Открытие' },
  { key: 'design', title: 'Дизайн и план' },
  { key: 'build', title: 'Сборка MVP' },
  { key: 'release', title: 'Релиз' },
  { key: 'operate', title: 'Эксплуатация' },
];
```
(Keep the existing `buildDefaultStages` mapping: order = index, first `active`, rest `not_started`.)

- [ ] **Step 2: Update roadmap STAGE_ICONS keys**

In `roadmap.tsx` map new keys to Remix icons:
```ts
const STAGE_ICONS: Record<string, RemixiconComponentType> = {
  discovery: RiSearchEyeLine,
  design: RiPencilRuler2Line,
  build: RiHammerLine,
  release: RiRocketLine,
  operate: RiGlobalLine,
};
```
(Remove the old idea/validate/prod keys. `stageIcon` fallback `RiFlag2Line` stays.)

- [ ] **Step 3: Fix any test asserting 6 default stages**

Search: `grep -rn "toHaveLength(6)\|length).toBe(6)\|idea\|validate" apps/api/src/stages`. Update any default-stages assertion to 5 and new keys.

- [ ] **Step 4: Verify + commit**

Run: `npx nx test api` (green). Commit: `feat(stages): redefine default stages to 5 (Открытие→Эксплуатация)`.

---

## Task 2: WikiSection.stageId

**Files:** Modify `prisma/schema.prisma`; migration.

- [ ] **Step 1: Add field + relation**

In `model WikiSection` add:
```prisma
  stageId String?
  stage   Stage?  @relation(fields: [stageId], references: [id], onDelete: SetNull)
  @@index([stageId])
```
In `model Stage` add back-relation: `wikiSections WikiSection[]`.

- [ ] **Step 2: Migrate**

Run: `npx prisma migrate dev --name wiki_section_stage`
Expected: additive migration applied to `moonga_studio`, client regenerated. If Prisma emits stale `RENAME CONSTRAINT` noise (diverged history artifact), hand-edit the generated `migration.sql` to keep ONLY the additive `ALTER TABLE "WikiSection" ADD COLUMN "stageId" TEXT;` + index + FK, then `npx prisma migrate deploy`.

- [ ] **Step 3: Verify + commit**

Run: `npx nx build data-access`. Commit: `feat(db): WikiSection.stageId for stage-scoped wiki`.

---

## Task 3: Stage templates data module

**Files:** Create `apps/api/src/stages/stage-templates.ts`.

- [ ] **Step 1: Types + content**

```ts
export type StageKey = 'discovery' | 'design' | 'build' | 'release' | 'operate';

export interface StageTemplate {
  backlogCards: { title: string; body?: string }[];
  wikiPages: { title: string; body: string }[];
  tools: { name: string; url: string; note?: string }[];
  links: { title: string; url: string }[];
}

/** Human-readable exit-criteria hint per stage (shown before advancing). */
export const STAGE_EXIT_CRITERIA: Record<StageKey, string> = {
  discovery: 'Одни и те же боли повторяются в 3+ интервью; принято решение GO / PIVOT / KILL.',
  design: 'Выбран один вариант решения, задача «concrete enough», задан таймбокс (аппетит) и scope MVP.',
  build: 'Feature-freeze: MVP feature-complete, критичные пути покрыты тестами.',
  release: 'Пройдены alpha→beta→GA, нет showstopper-багов, чеклист релиза закрыт.',
  operate: 'Финального гейта нет — этап конечный (мониторинг, поддержка, итерации).',
};

export const STAGE_TEMPLATES: Record<StageKey, StageTemplate> = {
  discovery: {
    backlogCards: [
      { title: 'Сформулировать гипотезу проблемы', body: 'Кого и какую боль решаем — одно предложение.' },
      { title: 'Составить гайд для интервью (Mom Test)', body: 'Вопросы про прошлое и факты, не про будущее и мнения.' },
      { title: 'Провести 5+ проблемных интервью' },
      { title: 'Свести инсайты в affinity-карту' },
      { title: 'Приоритизировать топ-3–5 болей' },
      { title: 'Принять решение GO / PIVOT / KILL' },
    ],
    wikiPages: [
      { title: 'Карта проблемы', body: '# Карта проблемы\n\n## Кого решаем (персоны)\n\n## Боль\n\n## Гипотеза\n' },
      { title: 'Инсайты интервью', body: '# Инсайты интервью\n\n| Кто | Инсайт | Цитата |\n|---|---|---|\n' },
      { title: 'Решение GO / PIVOT / KILL', body: '# Решение\n\n- Итог: \n- Обоснование: \n' },
    ],
    tools: [
      { name: 'Notion', url: 'https://notion.so', note: 'заметки, синтез инсайтов' },
      { name: 'Google Meet / Zoom', url: 'https://meet.google.com', note: 'интервью' },
      { name: 'tl;dv / Otter.ai', url: 'https://tldv.io', note: 'запись и транскрипты интервью' },
      { name: 'Dovetail', url: 'https://dovetail.com', note: 'affinity-карта, теги инсайтов' },
    ],
    links: [
      { title: 'The Mom Test (как говорить с юзерами)', url: 'https://www.momtestbook.com/' },
      { title: 'YC — How to talk to users', url: 'https://www.ycombinator.com/library/6g-how-to-talk-to-users' },
      { title: 'Teresa Torres — Continuous Discovery', url: 'https://www.producttalk.org/' },
    ],
  },
  design: {
    backlogCards: [
      { title: 'Переформулировать задачу (design challenge)' },
      { title: 'Сгенерировать 2–3 варианта решения' },
      { title: 'Собрать кликабельный прототип' },
      { title: 'Проверить прототип на 3–5 юзерах' },
      { title: 'Написать PRD' },
      { title: 'Задать аппетит (таймбокс) и нарезать scope MVP' },
    ],
    wikiPages: [
      { title: 'PRD', body: '# PRD\n\n## Проблема\n\n## Решение\n\n## Метрика успеха\n\n## Вне scope\n' },
      { title: 'Варианты решений и выбор', body: '# Варианты\n\n1. \n2. \n\n## Выбор и почему\n' },
      { title: 'Scope и аппетит MVP', body: '# Scope MVP\n\n- Аппетит (таймбокс): \n- В scope: \n- НЕ в scope: \n' },
    ],
    tools: [
      { name: 'Figma', url: 'https://figma.com', note: 'макеты и прототип' },
      { name: 'Excalidraw', url: 'https://excalidraw.com', note: 'быстрые схемы/флоу' },
      { name: 'Maze', url: 'https://maze.co', note: 'тест прототипа на юзерах' },
    ],
    links: [
      { title: 'Marty Cagan — Inspired (product discovery)', url: 'https://www.svpg.com/inspired-how-to-create-products-customers-love/' },
      { title: 'Shape Up — Appetite & Shaping', url: 'https://basecamp.com/shapeup/1.2-chapter-03' },
      { title: 'Google Design Sprint Kit', url: 'https://designsprintkit.withgoogle.com/' },
    ],
  },
  build: {
    backlogCards: [
      { title: 'Настроить репозиторий и окружение (CI)' },
      { title: 'Спроектировать схему данных' },
      { title: 'Реализовать ядро MVP (scope)' },
      { title: 'Написать автотесты на критичные пути' },
      { title: 'Довести до feature-complete (feature-freeze)' },
    ],
    wikiPages: [
      { title: 'Архитектура', body: '# Архитектура\n\nКомпоненты, потоки данных, ключевые решения.\n' },
      { title: 'Решения (ADR)', body: '# ADR\n\n## ADR-1: \n- Контекст: \n- Решение: \n- Последствия: \n' },
      { title: 'Тех-долг', body: '# Тех-долг\n\n- [ ] \n' },
    ],
    tools: [
      { name: 'Cursor / Claude Code', url: 'https://cursor.com', note: 'AI-ассистированная разработка' },
      { name: 'GitHub', url: 'https://github.com', note: 'репозиторий + CI (Actions)' },
      { name: 'Supabase / Neon', url: 'https://supabase.com', note: 'БД + auth быстро' },
      { name: 'Vercel / Railway', url: 'https://vercel.com', note: 'хостинг MVP' },
    ],
    links: [
      { title: 'The Twelve-Factor App', url: 'https://12factor.net/' },
      { title: 'Shape Up — Scope hammering', url: 'https://basecamp.com/shapeup/3.4-chapter-13' },
      { title: 'Dual-track agile (delivery)', url: 'https://www.svpg.com/dual-track-agile/' },
    ],
  },
  release: {
    backlogCards: [
      { title: 'Внутренний alpha-тест' },
      { title: 'Закрытая beta с реальными юзерами' },
      { title: 'Починить блокеры (showstoppers)' },
      { title: 'Подготовить чеклист релиза' },
      { title: 'Выкатить GA (публичный релиз)' },
    ],
    wikiPages: [
      { title: 'Чеклист релиза', body: '# Чеклист релиза\n\n- [ ] Мониторинг включён\n- [ ] Бэкапы\n- [ ] Онбординг/лендинг\n- [ ] Прайсинг\n' },
      { title: 'Известные баги', body: '# Известные баги\n\n| Баг | Severity | Статус |\n|---|---|---|\n' },
      { title: 'План выката (alpha/beta/GA)', body: '# План выката\n\n- alpha: \n- beta: \n- GA: \n' },
    ],
    tools: [
      { name: 'TestFlight / Firebase App Distribution', url: 'https://developer.apple.com/testflight/', note: 'бета-раздача' },
      { name: 'Flagsmith / ConfigCat', url: 'https://flagsmith.com', note: 'feature flags / canary' },
      { name: 'Sentry', url: 'https://sentry.io', note: 'ошибки на релизе' },
      { name: 'Product Hunt', url: 'https://producthunt.com', note: 'публичный лонч' },
    ],
    links: [
      { title: 'Software Release Life Cycle (alpha/beta/GA)', url: 'https://en.wikipedia.org/wiki/Software_release_life_cycle' },
      { title: 'Canary release with feature flags', url: 'https://configcat.com/blog/how-to-implement-a-canary-release-with-feature-flags/' },
    ],
  },
  operate: {
    backlogCards: [
      { title: 'Настроить мониторинг и алерты' },
      { title: 'Настроить сбор продуктовых метрик' },
      { title: 'Наладить канал поддержки/фидбека' },
      { title: 'Написать runbook инцидентов' },
      { title: 'Собрать инсайты → спланировать следующий виток' },
    ],
    wikiPages: [
      { title: 'Runbook', body: '# Runbook\n\n## Инцидент: шаги\n\n## Контакты/доступы\n' },
      { title: 'Метрики / SLO', body: '# Метрики\n\n- North Star: \n- SLO аптайма: \n' },
      { title: 'Обратная связь и идеи', body: '# Фидбек и идеи\n\n- \n' },
    ],
    tools: [
      { name: 'Sentry / Grafana', url: 'https://grafana.com', note: 'observability, дашборды' },
      { name: 'PostHog / Plausible', url: 'https://posthog.com', note: 'продуктовая аналитика' },
      { name: 'Crisp / Intercom', url: 'https://crisp.chat', note: 'поддержка и фидбек' },
      { name: 'UptimeRobot', url: 'https://uptimerobot.com', note: 'мониторинг аптайма' },
    ],
    links: [
      { title: 'Google SRE — SLO', url: 'https://sre.google/sre-book/service-level-objectives/' },
      { title: 'PostHog — product analytics guide', url: 'https://posthog.com/product-analytics' },
    ],
  },
};

/** Renders the tools+links of a template into one markdown wiki page body. */
export function renderToolsLinksPage(t: StageTemplate): string {
  const tools = t.tools.map((x) => `- [${x.name}](${x.url})${x.note ? ' — ' + x.note : ''}`).join('\n');
  const links = t.links.map((x) => `- [${x.title}](${x.url})`).join('\n');
  return `# Инструменты и ссылки\n\n## Рекомендованные инструменты\n\n${tools}\n\n## Полезные ссылки\n\n${links}\n`;
}
```

- [ ] **Step 2: Commit**

(No test needed for pure data; it's exercised by Task 4 tests.) Commit: `feat(stages): stage-templates content (backlog/wiki/tools/links)`.

---

## Task 4: Stage scaffold API

**Files:** Modify `apps/api/src/stages/stages.service.ts` (add `scaffold`), `stages.controller.ts` (route). Test: `apps/api/src/stages/stages.service.spec.ts`.

Scaffold does prisma writes directly in a transaction (mirrors board seeding). Idempotent: if the stage already has a board, return it without re-seeding.

- [ ] **Step 1: Write failing tests**

```ts
// scaffold: creates a board with template cards + a stage wiki section with pages
it('scaffold seeds board, template cards, and a stage wiki section', async () => {
  // prisma mock: stage findUnique -> {id:'s1', projectId:'p1', key:'discovery', title:'Открытие'}
  //   board.findFirst({where:{stageId}}) -> null (not yet scaffolded)
  //   board.aggregate max seq -> null; board.create -> {id:'b1'}; column.createMany; card.createMany;
  //   wikiSection.create -> {id:'w1'}; wikiPage.createMany
  const res = await svc.scaffold('p1', 's1', user);
  expect(prisma.card.createMany).toHaveBeenCalled();      // template backlog seeded
  expect(prisma.wikiSection.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stageId: 's1' }) }));
  expect(res.boardId).toBe('b1');
});
it('scaffold is idempotent — returns existing board without re-seeding', async () => {
  // board.findFirst({where:{stageId}}) -> {id:'b1'}
  const res = await svc.scaffold('p1', 's1', user);
  expect(prisma.card.createMany).not.toHaveBeenCalled();
  expect(res.boardId).toBe('b1');
});
it('scaffold on a custom (non-template) stage seeds board + columns but no template cards/wiki', async () => {
  // stage key not in STAGE_TEMPLATES (e.g. key:null)
  const res = await svc.scaffold('p1', 's9', user);
  expect(prisma.card.createMany).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `scaffold`**

```ts
import { buildDefaultColumns } from '../columns/default-columns';
import { STAGE_TEMPLATES, StageKey } from './stage-templates';
import { renderToolsLinksPage } from './stage-templates';

async scaffold(projectId: string, stageId: string, user: RequestActor): Promise<{ boardId: string }> {
  await assertMembership(this.prisma, user, projectId);
  const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage || stage.projectId !== projectId) throw new NotFoundException('Stage not found in project');

  const existing = await this.prisma.board.findFirst({ where: { stageId } });
  if (existing) return { boardId: existing.id };

  const tpl = stage.key && (STAGE_TEMPLATES as Record<string, any>)[stage.key]
    ? STAGE_TEMPLATES[stage.key as StageKey] : null;

  return this.prisma.$transaction(async (tx) => {
    const seqAgg = await tx.board.aggregate({ where: { projectId }, _max: { seq: true } });
    const board = await tx.board.create({
      data: { projectId, name: stage.title, seq: (seqAgg._max.seq ?? 0) + 1, stageId },
    });
    await tx.column.createMany({ data: buildDefaultColumns(board.id) });
    if (tpl) {
      const openCol = await tx.column.findFirst({ where: { boardId: board.id, order: 0 } });
      if (openCol && tpl.backlogCards.length) {
        // card.number is per-board sequential; seed from 1
        await tx.card.createMany({
          data: tpl.backlogCards.map((c, i) => ({
            boardId: board.id, columnId: openCol.id, number: i + 1,
            title: c.title, body: c.body ?? '', order: i,
          })),
        });
      }
      const sectionAgg = await tx.wikiSection.aggregate({ where: { projectId }, _max: { order: true } });
      const section = await tx.wikiSection.create({
        data: { projectId, stageId, title: stage.title, order: (sectionAgg._max.order ?? -1) + 1 },
      });
      const pages = [...tpl.wikiPages, { title: 'Инструменты и ссылки', body: renderToolsLinksPage(tpl) }];
      await tx.wikiPage.createMany({
        data: pages.map((p, i) => ({ sectionId: section.id, title: p.title, body: p.body, order: i })),
      });
    }
    return { boardId: board.id };
  });
}
```
NOTE for implementer: verify `Card` required fields (esp. `number`, `authorId`/`authorType` nullability) against `prisma/schema.prisma` and `createCard` in boards/cards service; adjust the `card.createMany` data to satisfy non-null columns (mirror how the app creates cards). Same for `wikiPage`/`wikiSection` required fields.

- [ ] **Step 4: Controller route**

```ts
@Post('projects/:projectId/stages/:stageId/scaffold')
scaffold(@Param('projectId') p: string, @Param('stageId') s: string, @Req() req: any) {
  return this.stages.scaffold(p, s, req.user);
}
```

- [ ] **Step 5: Run tests green; `npx nx build api`. Commit:** `feat(api): stage scaffold — board+template backlog+stage wiki (#этапы)`.

---

## Task 5: Web — "Развернуть этап" + exit-criteria hint

**Files:** Modify `apps/web/src/api/stages.ts`, `apps/web/src/pages/roadmap.tsx`.

- [ ] **Step 1: API client**

```ts
export const scaffoldStage = (projectId: string, stageId: string) =>
  api(`/api/projects/${projectId}/stages/${stageId}/scaffold`, { method: 'POST' });
```
(Use the same fetch wrapper the other stages.ts calls use.)

- [ ] **Step 2: "Развернуть этап" button**

In each stage card in `roadmap.tsx`: if the stage has NO boards (`s.boards.length === 0`) and its `key` is one of discovery/design/build/release/operate → show a primary button «Развернуть этап» that calls `scaffoldStage(projectId, s.id)` then `invalidate()` (refetch stages). If the stage already has boards → keep the existing board list + «Создать доску». For custom stages (key not in the 5) keep only «Создать доску».

- [ ] **Step 3: Exit-criteria hint on "Продвинуть"**

Add a small muted line / tooltip near the active stage's «Продвинуть дальше» button showing the exit criteria for the current stage. Define the criteria map on the web side (mirror `STAGE_EXIT_CRITERIA`) keyed by stage `key`; render `criteria[s.key]` if present. Advancing still works as today (updateStage current→done, next→active).

- [ ] **Step 4: `npx nx build web` passes. Commit:** `feat(web): развернуть этап + подсказка критериев выхода`.

---

## Task 6: Web — «История» (collapse done stages)

**Files:** Modify `apps/web/src/pages/roadmap.tsx`.

- [ ] **Step 1: Group stages**

Split `stages` into `active = stages.filter(s => s.status !== 'done')` and `done = stages.filter(s => s.status === 'done')`. Render `active` as the main pipeline (unchanged). Render `done` inside a collapsible block titled «История (N)» at the bottom — collapsed by default (`useState(false)`), expands to show the done stage cards WITH their boards (same card component, read-only feel is fine). Preserve flow arrows only within the active pipeline.

- [ ] **Step 2: `npx nx build web` passes. Commit:** `feat(web): свёрнутый блок «История» для пройденных этапов`.

---

## Task 7: Verification + tracker

- [ ] **Step 1:** `npx nx run-many -t typecheck` — no new errors beyond pre-existing spec ones.
- [ ] **Step 2:** `npx nx test api` — green incl. scaffold tests.
- [ ] **Step 3:** `npx nx build api web` — green.
- [ ] **Step 4: Manual (servers running):** new project → roadmap shows 5 new stages → «Развернуть этап» on Открытие creates a board with the template cards + a wiki section «Открытие» with an «Инструменты и ссылки» page → «Продвинуть» shows the exit-criteria hint and advances → the advanced stage moves into «История» with its board.
- [ ] **Step 5:** Update tracker card #34 (Плейбуки) — this delivers stage templates/scaffold; mark progress or link. Note: metrics/#36 stays cancelled.

---

## Self-Review notes
- **Spec coverage:** 5 stages (T1), WikiSection.stageId (T2), templates incl. tools/links (T3), scaffold board+backlog+wiki (T4), «Развернуть этап» + gate hint (T5), История (T6). Terminology/«этап» handled in T5/T6 copy. All spec sections covered.
- **Placeholder scan:** template content is concrete (T3). The only soft note is the implementer verifying Card/WikiPage required-field shapes against the live schema (flagged in T4 Step 3) — that's a real correctness check, not a content placeholder.
- **Type consistency:** `StageKey`, `STAGE_TEMPLATES`, `STAGE_EXIT_CRITERIA`, `renderToolsLinksPage`, `scaffold(projectId, stageId, user) → {boardId}`, `scaffoldStage(projectId, stageId)` used consistently across tasks.
- **Assumption to confirm at execution:** exact required columns on `Card` (number/authorType/authorId) and `WikiPage`/`WikiSection` — mirror existing creation code (boards.service card seeding was removed, so check cards.service/create-card path) so `createMany` doesn't violate NOT NULL.
