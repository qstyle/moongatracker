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
