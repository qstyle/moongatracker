# MCP-онбординг для пользователя + скил работы с трекером

**Дата:** 2026-07-01
**Статус:** дизайн утверждён, ждёт ревью спеки

## Проблема

MCP-сервер `apps/mcp` работает только у разработчика: запускается из чекаута
(`node --import tsx/esm apps/mcp/src/main.ts`), `cwd` захардкожен в `.mcp.json`,
пакет `private: true`, рантайм-зависимости не объявлены (берутся из хойстнутых
`node_modules` монорепо), `bin` нет. Публичный SaaS-пользователь hosted-инстанса
не может подключить своего агента (Claude Code / Cursor) к доске.

Отдельно: нет «скила» — переносимого набора правил, который научит агента
пользователя работать с доской по правильному жизненному циклу карточки и
человеко-гейту.

## Что уже готово (не трогаем)

- **Авторизация.** `apps/api/src/auth/unified-auth.guard.ts` принимает либо
  пользовательский JWT, либо `ApiToken` (Bearer). Токен project-scoped, агент
  в аудите — `actorType=agent`. Серверная часть изменений не требует.
- **Выпуск токена.** UI готов: вкладка «AI-агенты» в `apps/web/src/pages/settings.tsx`
  (создание со скоупами `cards:read` / `cards:write` / `comments:write`,
  разовый показ + копирование, список + отзыв). Эндпоинты —
  `apps/api/src/api-tokens/api-tokens.controller.ts`.
- **13 MCP-инструментов** в `apps/mcp/src/tools/`: `list_projects`, `list_cards`,
  `get_card`, `create_card`, `move_card`, `update_card`, `comment_card`,
  `list_activity`, `list_wiki`, `get_wiki_page`, `create_wiki_page`,
  `update_wiki_page`, `get_canvas`.

## Ключевой факт: колонки динамические

`model Column { id, boardId, title, order }` — колонки это строки БД на доску.
`idea → triage → backlog → in_dev → done` — только сид-дефолт. API работает по
`columnId`. Отсюда главное правило скила: **сначала discovery, потом действие** —
никогда не хардкодить id колонок.

## Решение

Три артефакта. Транспорт остаётся **stdio**, распространение — **npx-пакет**
`@moongatracker/mcp`. Remote-HTTP не делаем (осознанно вне скоупа).

### A. Публикуемый npx-пакет `@moongatracker/mcp`

Цель: пользователь добавляет в конфиг агента `npx -y @moongatracker/mcp` +
две env-переменные, ничего не собирая руками.

Изменения в `apps/mcp/package.json`:
- убрать `private: true`;
- добавить `version`, `bin` (`moongatracker-mcp` → `dist/main.js`),
  `files` (`dist`, `SKILL.md`), `publishConfig.access: public`, `engines.node`;
- объявить рантайм-зависимость `@modelcontextprotocol/sdk` (версию взять ту же,
  что резолвится в корневом `package-lock.json`);
- **не** тащить `tsx` в зависимости пакета — публикуется скомпилированный JS.

Сборка:
- `dist/main.js` собирается из `nx build mcp` (executor `@nx/js:tsc`,
  `outputPath: dist/apps/mcp`); исходники уже используют `.js`-ESM-спецификаторы.
- В `dist/main.js` должен попасть шебанг `#!/usr/bin/env node` (добавить первой
  строкой в `apps/mcp/src/main.ts` — tsx его проигнорирует, в собранном JS он
  окажется наверху и сделает bin исполняемым).
- `apps/mcp/src/api-client.ts` уже читает `MOONGATRACKER_API_URL` /
  `MOONGATRACKER_API_TOKEN` с дефолтом на localhost — контракт env не меняем.

Публикация — ручная (`npm publish` из `dist/apps/mcp`) на этом этапе;
автоматизация в CI вне скоупа.

Локальный `.mcp.json` в репо (tsx, для контрибьюторов) остаётся как есть.

**Env-контракт пакета:**
| Переменная | Значение |
|-----------|----------|
| `MOONGATRACKER_API_URL` | origin инстанса (напр. `https://board.example.com`) |
| `MOONGATRACKER_API_TOKEN` | токен из вкладки «AI-агенты» |

### B. Онбординг-дока `docs/CONNECT_MCP.md` (+ подсказка в UI)

Copy-paste гайд для человека:
1. Создать токен в **Настройки → AI-агенты** (скоупы `cards:read`,
   `cards:write`, `comments:write`).
2. Взять URL своего инстанса (origin, где логинишься).
3. Добавить MCP в агента — готовые блоки:
   - **Claude Code**: `claude mcp add` и эквивалентная форма `.mcp.json`;
   - **Cursor**: форма `mcpServers`.
   Оба со `npx -y @moongatracker/mcp` и env `MOONGATRACKER_API_URL` /
   `MOONGATRACKER_API_TOKEN`.
4. Установить скил (см. C) в `.claude/skills/moongatracker/`.
5. Проверка: попросить агента «покажи проекты» (вызов `list_projects`).
6. Траблшутинг: 401 → неверный/отозванный токен или не хватает скоупа;
   `ECONNREFUSED`/таймаут → неверный `MOONGATRACKER_API_URL`.

Плюс маленький блок «Как подключить агента» на вкладке «AI-агенты»
(`settings.tsx`): 2–3 строки + ссылка/раскрытие с готовым сниппетом, чтобы
пользователь не искал доку отдельно.

### C. Скил `skills/moongatracker/SKILL.md`

Переносимый `SKILL.md` в репо, **вшитый в `files` npm-пакета** — пользователь
копирует его в `.claude/skills/moongatracker/` (шаг 4 доки). Frontmatter:
`name: moongatracker`, `description` в стиле «Use when working the moongatracker
board via its MCP…».

Содержание:
- **Discovery-first.** Не хардкодить id: `list_projects(projectId)` → доски →
  колонки (`id`/`title`/`order`) → `list_cards(boardId)`.
- **Жизненный цикл** `idea → triage → backlog → in_dev → done`, резолвится в
  реальный `columnId` по `title`/`order`.
- **Карта 13 инструментов** — когда какой (создать/двигать/обновить карточку,
  комментарий, активность, wiki, canvas).
- **Человеко-гейт.** Необратимое/дорогое (перевод в `in_dev`/`done`, удаление,
  массовые операции) — агент *предлагает* через `comment_card` и ждёт
  подтверждения человека, не делает молча.
- **Трейс/откат.** Каждая мутация пишет `Activity` (`actorType=agent`);
  `list_activity` для истории; откат восстанавливает `before`.

Распространение скила: вшиваем в npm-пакет + copy-paste в доке. Публичный реестр
скилов и отдача через поле `instructions` MCP-сервера — вне скоупа.

## Границы (out of scope)

- Remote-HTTP / Streamable-HTTP транспорт.
- Автопубликация пакета в CI.
- Любые изменения серверной авторизации и модели токенов.
- Публичный реестр скилов.

## Критерии готовности

1. `npx -y @moongatracker/mcp` (с валидными env) поднимает stdio-сервер, агент
   видит 13 инструментов и успешно вызывает `list_projects` против hosted API.
2. `docs/CONNECT_MCP.md` даёт человеку путь от нуля до рабочего агента без
   чтения исходников; на вкладке «AI-агенты» есть ссылка/подсказка.
3. `skills/moongatracker/SKILL.md` существует, вшит в `files` пакета, учит
   discovery-first, жизненному циклу, человеко-гейту и трейсу/откату.
