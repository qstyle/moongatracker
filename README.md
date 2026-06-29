# Moongatracker

Self-hosted канбан, спроектированный под **совместную работу человека и AI-агента**.
Доска «Идеи» + доска «Разработка», агент (OpenClaw / Claude) — полноправный участник,
который читает, создаёт и двигает карточки через REST API и MCP.

Не «ещё один Trello»: доска — это **общая память** человека и агента. Идея проходит
путь от наброска до релиза на одной карточке, каждое действие агента трассируется и
может быть откачено.

## Статус

🟢 **Phase 0 — каркас готов.** Nx-монорепо, api (NestJS+Fastify), web (Vite+React+shadcn),
SQLite через Prisma, эндпоинт `GET /api/boards`, Docker-контейнер. Дальше — Phase 1 (MVP-доска).
Документация в [`docs/`](docs/) — источник правды.

## Стек (максимальная экономия ресурсов)

| Слой       | Технология                         | Почему                                                        |
| ---------- | ---------------------------------- | ------------------------------------------------------------- |
| Backend    | **NestJS (Fastify-адаптер)**       | Привычный стек, типобезопасно, легче Express                  |
| БД         | **SQLite + Prisma**                | Встроена в процесс — нет отдельного демона; бэкап = один файл |
| Frontend   | **Vite + React (SPA)** + shadcn/ui | Статическая сборка, без SSR-процесса; пресет UI `b6GNZujOi`   |
| Realtime   | **Socket.IO** (Nest gateway)       | Живое обновление доски                                        |
| Агент-слой | **REST API + MCP-сервер**          | Агент рулит доской как инструментом                           |
| Монорепо   | **Nx**                             | Общие TS-типы фронт ↔ бэк ↔ mcp                               |
| Деплой     | **Docker Compose**, self-hosted    | Один контейнер, ~120–180 МБ RAM                               |

Рантайм: **один Node-процесс + файл SQLite**. SPA вшивается в раздачу API — отдельного
nginx/Node на фронт нет.

## Структура монорепо

```
moongatracker/
├── apps/
│   ├── api        # NestJS (Fastify) — REST + WebSocket, бизнес-логика
│   ├── web        # Vite + React SPA — доска, drag&drop, realtime
│   └── mcp        # MCP-сервер — обёртка над API для агента
├── libs/
│   ├── shared-types   # общие DTO/типы (фронт ↔ бэк ↔ mcp)
│   └── data-access    # Prisma client + репозитории (абстракция БД)
├── prisma/        # schema.prisma + миграции (SQLite)
├── docs/          # документация (дизайн, модель данных, агент-слой, роадмап)
└── docker-compose.yml
```

## Документация

- [docs/DESIGN.md](docs/DESIGN.md) — архитектура, модель данных, жизненный цикл карточки, деплой
- [docs/AGENT_INTEGRATION.md](docs/AGENT_INTEGRATION.md) — MCP-инструменты, API-токены, трейс и откат
- [docs/ROADMAP.md](docs/ROADMAP.md) — поэтапный план реализации

## Локальная разработка

```bash
npm install
npx prisma migrate dev && npx prisma db seed   # SQLite + демо-доска «Главная»
npx nx serve api    # http://localhost:3020/api  (GET /api/boards)
npx nx serve web    # http://localhost:4200      (проксирует /api на api)
```

## Docker (self-hosted)

```bash
docker compose up -d --build   # api на :3020, SQLite в volume mgt-data
```

Контейнер применяет миграции (`prisma migrate deploy`) при старте; данные БД — в
именованном томе `mgt-data` (`/data/moongatracker.db`).

## Дальше

Phase 0 готов → следующий шаг — Phase 1 (MVP-доска): CRUD карточек, drag&drop,
комментарии, auth, Socket.IO. План — в [docs/ROADMAP.md](docs/ROADMAP.md).
