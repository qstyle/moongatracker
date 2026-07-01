# MCP-онбординг + скил работы с трекером — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать публичному SaaS-пользователю подключить своего AI-агента к hosted moongatracker через `npx @moongatracker/mcp` и переносимый скил, который учит агента правильно работать с доской.

**Architecture:** Транспорт остаётся stdio; MCP публикуется как npm-пакет и запускается через `npx`. Серверная авторизация и UI-выпуск токена уже готовы — не трогаем. Добавляем: (A) publish-метаданные пакета + шебанг + копирование скила в build, (B) онбординг-доку + подсказку в UI, (C) переносимый `SKILL.md`.

**Tech Stack:** Nx monorepo, `@nx/js:tsc`, `@modelcontextprotocol/sdk@^1.26.0`, Node ≥ 20, React (Vite, shadcn/ui), Markdown.

**Спека:** `docs/superpowers/specs/2026-07-01-mcp-onboarding-and-skill-design.md`

---

## Обзор файлов

- Create: `skills/moongatracker/SKILL.md` — переносимый скил (Task 1).
- Modify: `apps/mcp/src/main.ts` — добавить шебанг (Task 2).
- Modify: `apps/mcp/package.json` — publish-метаданные + рантайм-зависимость (Task 2).
- Modify: `apps/mcp/project.json` — asset: копировать SKILL.md в dist (Task 2).
- Create: `docs/CONNECT_MCP.md` — онбординг для человека (Task 3).
- Modify: `apps/web/src/pages/settings.tsx` — блок «Как подключить агента» в табе токенов (Task 4).

Ключевой факт: колонки динамические (`Column { id, title, order }` на доску) — скил учит discovery-first. Все импорты из `@moongatracker/shared-types` в `apps/mcp` — `import type` (стираются при компиляции), рантайм-зависимости от внутренней либы нет.

---

## Task 1: Скил `skills/moongatracker/SKILL.md`

**Files:**
- Create: `skills/moongatracker/SKILL.md`

- [ ] **Step 1: Создать файл скила**

Create `skills/moongatracker/SKILL.md` с точным содержимым:

````markdown
---
name: moongatracker
description: Use when driving a moongatracker board through its MCP server (list_projects/list_cards/create_card/move_card/comment_card/…). Enforces discovery-first ID resolution, the idea→triage→backlog→in_dev→done lifecycle, the human-gate for irreversible moves, and the Activity trace/rollback model.
---

# Working the moongatracker board via MCP

moongatracker is a shared human+agent kanban. You act through the MCP tools, never the DB directly. Every mutation you make is recorded in `Activity` as `actorType=agent` and can be rolled back by a human.

## Golden rule: discovery-first, never hardcode IDs

Boards and columns are per-project rows in the DB — their IDs and titles differ across instances and boards. Always resolve IDs at runtime:

1. `list_projects(projectId)` → boards in the workspace (each has `id`, `name`).
2. Inspect the board's cards with `list_cards(boardId)` — each card carries its `columnId`; the set of columns and their order come from the board.
3. Match a column by its human title / order (lifecycle below), then pass the resolved `columnId` to `create_card` / `move_card` / `update_card`.

Never invent a column id or reuse one from another board.

## Card lifecycle

`idea → triage → backlog → in_dev → done`

- **idea** — raw capture. New cards default here.
- **triage** — clarify, ask questions in comments, add a summary.
- **backlog** — accepted, has a mini-spec in the body.
- **in_dev** — being built. (human-gated — see below)
- **done** — shipped. (human-gated)

Titles/order are the source of truth (they may be localized, e.g. «Идеи», «Разбор»); map by position when titles differ.

## Tools

| Tool | Use it to |
|------|-----------|
| `list_projects` | list boards in a project (workspace) |
| `list_cards` | list cards on a board (optionally by column) |
| `get_card` | full card with comments + history |
| `create_card` | create a card (resolve `boardId` + `columnId` first) |
| `move_card` | change a card's `columnId` |
| `update_card` | title / body / priority / column |
| `comment_card` | add a comment (shows as author=agent) |
| `list_activity` | a card's action history (trace / rollback) |
| `list_wiki` / `get_wiki_page` / `create_wiki_page` / `update_wiki_page` | project wiki |
| `get_canvas` | project canvas |

## Human-gate: propose, don't silently do

Irreversible or expensive actions are NOT yours to execute unprompted. For these, add a `comment_card` proposing the action and wait for the human to confirm (in the UI or chat):

- moving a card into `in_dev` or `done`
- deleting anything
- bulk / multi-card operations

Reversible steps you may do directly: create in idea, comment, update body/priority, move among idea ↔ triage ↔ backlog.

## Trace & rollback

Every mutation writes an `Activity { action, before, after, actorType=agent }`. Use `list_activity(cardId)` to show what you changed. Keep each mutation small and self-describing so a human can roll back to `before` from a single Activity record.
````

- [ ] **Step 2: Проверить frontmatter и наличие файла**

Run: `head -5 skills/moongatracker/SKILL.md && test -f skills/moongatracker/SKILL.md && echo OK`
Expected: видно `---`, `name: moongatracker`, `description:` и `OK`.

- [ ] **Step 3: Commit**

```bash
git add skills/moongatracker/SKILL.md
git commit -m "feat(skill): moongatracker board skill for agents"
```

---

## Task 2: Публикуемый npx-пакет `@moongatracker/mcp`

**Files:**
- Modify: `apps/mcp/src/main.ts` (первая строка)
- Modify: `apps/mcp/package.json`
- Modify: `apps/mcp/project.json` (`targets.build.options.assets`)

- [ ] **Step 1: Убедиться, что текущий пакет непубликуемый (baseline)**

Run: `grep -E '"private"|"bin"' apps/mcp/package.json || echo "no bin, private state above"`
Expected: `"private": true` присутствует, `bin` отсутствует — пакет пока нельзя ставить через npx.

- [ ] **Step 2: Добавить шебанг первой строкой `apps/mcp/src/main.ts`**

Вставить в самое начало файла (перед первым `import`):

```ts
#!/usr/bin/env node
```

- [ ] **Step 3: Переписать `apps/mcp/package.json` под публикацию**

Заменить всё содержимое на:

```json
{
  "name": "@moongatracker/mcp",
  "version": "0.1.0",
  "description": "MCP server for the moongatracker kanban board",
  "type": "module",
  "bin": {
    "moongatracker-mcp": "./src/main.js"
  },
  "files": ["src", "SKILL.md"],
  "engines": {
    "node": ">=20"
  },
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0"
  }
}
```

Примечание: `bin`/`files` указывают на `./src/main.js` и `SKILL.md`, потому что публикуем из каталога `dist/apps/mcp` (см. Step 6). `private` убран намеренно.

- [ ] **Step 4: Добавить копирование скила в build (`apps/mcp/project.json`)**

Заменить `"assets": []` в `targets.build.options` на:

```json
"assets": [
  { "input": "skills/moongatracker", "glob": "SKILL.md", "output": "." }
]
```

Итог: `apps/mcp/project.json` → `targets.build.options` содержит `outputPath`, `main`, `tsConfig` и обновлённый `assets`.

- [ ] **Step 5: Собрать пакет**

Run: `npx nx build mcp`
Expected: `Successfully ran target build for project mcp`.

- [ ] **Step 6: Проверить содержимое dist (шебанг, метаданные, скил, зависимости)**

Run:
```bash
head -1 dist/apps/mcp/src/main.js
node -e "const p=require('./dist/apps/mcp/package.json'); console.log('private:',p.private,'bin:',JSON.stringify(p.bin),'deps:',JSON.stringify(p.dependencies))"
test -f dist/apps/mcp/SKILL.md && echo "SKILL.md: OK"
```
Expected:
- первая строка: `#!/usr/bin/env node`
- `private: undefined bin: {"moongatracker-mcp":"./src/main.js"} deps: {"@modelcontextprotocol/sdk":"^1.26.0"}` (в deps НЕТ `@moongatracker/shared-types`)
- `SKILL.md: OK`

- [ ] **Step 7: Smoke-тест — сервер отдаёт 13 инструментов по stdio (без сети)**

Run:
```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | node dist/apps/mcp/src/main.js \
  | grep -o '"list_projects"\|"create_card"\|"move_card"\|"get_canvas"' | sort -u
```
Expected: четыре строки — `"create_card"`, `"get_canvas"`, `"list_projects"`, `"move_card"` (инструменты перечисляются; `tools/list` не требует API).

- [ ] **Step 8: Проверить упаковку `npm pack` (что попадёт в tarball)**

Run: `cd dist/apps/mcp && npm pack --dry-run 2>&1 | grep -E 'SKILL.md|src/main.js|package.json' ; cd -`
Expected: в списке есть `package.json`, `src/main.js` и `SKILL.md`.

- [ ] **Step 9: Commit**

```bash
git add apps/mcp/src/main.ts apps/mcp/package.json apps/mcp/project.json
git commit -m "feat(mcp): publishable npx package (@moongatracker/mcp) + bundle skill"
```

---

## Task 3: Онбординг-дока `docs/CONNECT_MCP.md`

**Files:**
- Create: `docs/CONNECT_MCP.md`

- [ ] **Step 1: Создать доку**

Create `docs/CONNECT_MCP.md` с точным содержимым:

````markdown
# Подключение AI-агента к moongatracker (MCP)

Пошагово: от токена до рабочего агента (Claude Code / Cursor), который двигает вашу доску.

## 1. Создайте токен

Откройте **Настройки → AI-агенты**, задайте имя (например `claude-mcp`), выберите скоупы
`cards:read`, `cards:write`, `comments:write` и нажмите «Создать токен».
Скопируйте токен сразу — повторно он не показывается.

## 2. Узнайте URL инстанса

Это origin, на котором вы логинитесь, например `https://board.example.com`
(без `/api` и без слэша на конце).

## 3. Добавьте MCP в агента

MCP-сервер ставится из npm через `npx`, отдельная установка не нужна.

### Claude Code

```bash
claude mcp add moongatracker \
  --env MOONGATRACKER_API_URL=https://board.example.com \
  --env MOONGATRACKER_API_TOKEN=<ваш-токен> \
  -- npx -y @moongatracker/mcp
```

Или вручную в `.mcp.json`:

```json
{
  "mcpServers": {
    "moongatracker": {
      "command": "npx",
      "args": ["-y", "@moongatracker/mcp"],
      "env": {
        "MOONGATRACKER_API_URL": "https://board.example.com",
        "MOONGATRACKER_API_TOKEN": "<ваш-токен>"
      }
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "moongatracker": {
      "command": "npx",
      "args": ["-y", "@moongatracker/mcp"],
      "env": {
        "MOONGATRACKER_API_URL": "https://board.example.com",
        "MOONGATRACKER_API_TOKEN": "<ваш-токен>"
      }
    }
  }
}
```

## 4. Установите скил (рекомендуется)

Скил учит агента правильному циклу карточки (idea→triage→backlog→in_dev→done) и
человеко-гейту. Он лежит в npm-пакете — скопируйте его в свой каталог скилов:

```bash
mkdir -p .claude/skills/moongatracker
cp "$(npm root)/@moongatracker/mcp/SKILL.md" .claude/skills/moongatracker/SKILL.md
```

Если пакет запускается только через `npx` (без локальной установки), возьмите `SKILL.md`
из репозитория: `skills/moongatracker/SKILL.md`.

## 5. Проверка

Перезапустите агента и попросите: «покажи проекты в moongatracker». Агент должен вызвать
`list_projects` и вернуть ваши доски.

## Траблшутинг

- **401 Unauthorized** — токен неверный/отозван или не хватает скоупа. Выпустите новый во
  вкладке «AI-агенты».
- **ECONNREFUSED / таймаут** — неверный `MOONGATRACKER_API_URL` (проверьте origin, `https`,
  отсутствие `/api` и хвостового слэша).
- **Агент не видит инструменты** — убедитесь, что `npx -y @moongatracker/mcp` запускается
  (нужен Node ≥ 20) и что MCP включён в настройках агента.
````

- [ ] **Step 2: Проверить, что ссылки/пути в доке существуют**

Run: `test -f skills/moongatracker/SKILL.md && grep -q '@moongatracker/mcp' docs/CONNECT_MCP.md && echo OK`
Expected: `OK` (скил, на который ссылается дока, существует; имя пакета совпадает).

- [ ] **Step 3: Commit**

```bash
git add docs/CONNECT_MCP.md
git commit -m "docs: how to connect an AI agent via MCP"
```

---

## Task 4: Подсказка «Как подключить агента» в UI (таб токенов)

**Files:**
- Modify: `apps/web/src/pages/settings.tsx` (внутри `<TabsContent value="tokens">`, первым элементом обёртки `max-w-lg`)

- [ ] **Step 1: Вставить блок-подсказку**

В `apps/web/src/pages/settings.tsx` найти открытие таба токенов:

```tsx
        <TabsContent value="tokens">
          <div className="max-w-lg space-y-6">
            {createdToken && (
```

Вставить новый блок сразу после `<div className="max-w-lg space-y-6">` и перед `{createdToken && (`:

```tsx
            <div className="space-y-2 rounded border border-border/60 bg-muted/30 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Как подключить агента</div>
              <p className="text-muted-foreground">
                Создайте токен ниже, затем добавьте MCP-сервер в своего агента (Claude Code / Cursor):
              </p>
              <pre className="overflow-x-auto rounded bg-muted px-2 py-1.5 text-xs font-mono text-foreground">{`npx -y @moongatracker/mcp
MOONGATRACKER_API_URL=${window.location.origin}
MOONGATRACKER_API_TOKEN=<токен>`}</pre>
              <p className="text-muted-foreground">
                Полная инструкция — <span className="text-foreground">docs/CONNECT_MCP.md</span>.
              </p>
            </div>
```

- [ ] **Step 2: Собрать web (единственная надёжная проверка в этом проекте)**

Run: `npx nx build web`
Expected: сборка проходит успешно (`Successfully ran target build for project web`). Примечание: у web нет `nx lint`, а `typecheck` пред-существующе красный по несвязанным местам — источник истины здесь `nx build web`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/settings.tsx
git commit -m "feat(web): agent-connect hint in AI tokens settings tab"
```

---

## Self-review

**Покрытие спеки:**
- A (публикуемый npx-пакет) → Task 2 (шебанг, publish-метаданные, deps только sdk, asset SKILL.md, smoke + npm pack).
- B (онбординг-дока + подсказка в UI) → Task 3 (`docs/CONNECT_MCP.md`) + Task 4 (блок в `settings.tsx`).
- C (переносимый SKILL.md, вшитый в npm) → Task 1 (файл) + Task 2 Step 4/6/8 (asset-копирование и наличие в tarball).
- Границы (нет remote-HTTP, нет серверных изменений, нет автопубликации в CI, нет реестра скилов) — соблюдены: ни одна задача их не затрагивает.

**Плейсхолдеры:** нет — SKILL.md, CONNECT_MCP.md и JSX-блок приведены полностью.

**Согласованность типов/имён:** имя пакета `@moongatracker/mcp`, bin `moongatracker-mcp` → `./src/main.js`, env `MOONGATRACKER_API_URL`/`MOONGATRACKER_API_TOKEN`, путь скила `skills/moongatracker/SKILL.md` — единообразны во всех задачах и совпадают с тем, что читает `apps/mcp/src/api-client.ts`.
