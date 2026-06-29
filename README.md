# Moongatracker

Self-hosted канбан, спроектированный под **совместную работу человека и AI-агента**.
Доска «Идеи» + доска «Разработка», агент (OpenClaw / Claude) — полноправный участник,
который читает, создаёт и двигает карточки через REST API и MCP.

Не «ещё один Trello»: доска — это **общая память** человека и агента. Идея проходит
путь от наброска до релиза на одной карточке, каждое действие агента трассируется и
может быть откачено.

## Статус

🟢 **Phase 0 — каркас готов.** Nx-монорепо, api (NestJS+Fastify), web (Vite+React+shadcn),
PostgreSQL через Prisma, эндпоинт `GET /api/boards`, Docker-контейнер. Дальше — Phase 1 (MVP-доска).
Документация в [`docs/`](docs/) — источник правды.

## Стек (максимальная экономия ресурсов)

| Слой       | Технология                         | Почему                                                      |
| ---------- | ---------------------------------- | ----------------------------------------------------------- |
| Backend    | **NestJS (Fastify-адаптер)**       | Привычный стек, типобезопасно, легче Express                |
| БД         | **PostgreSQL + Prisma**            | Внешний/общий сервер БД; абстракция в `data-access`         |
| Frontend   | **Vite + React (SPA)** + shadcn/ui | Статическая сборка, без SSR-процесса; пресет UI `b6GNZujOi` |
| Realtime   | **Socket.IO** (Nest gateway)       | Живое обновление доски                                      |
| Агент-слой | **REST API + MCP-сервер**          | Агент рулит доской как инструментом                         |
| Монорепо   | **Nx**                             | Общие TS-типы фронт ↔ бэк ↔ mcp                             |
| Деплой     | **Docker Compose**, self-hosted    | Один контейнер, ~120–180 МБ RAM                             |

Рантайм: **один Node-процесс**, подключается к **внешнему PostgreSQL** (compose его НЕ
поднимает — переиспользуется уже работающий сервер). SPA вшивается в раздачу API.

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
├── prisma/        # schema.prisma + миграции (PostgreSQL)
├── docs/          # документация (дизайн, модель данных, агент-слой, роадмап)
└── docker-compose.yml
```

## Документация

- [docs/DESIGN.md](docs/DESIGN.md) — архитектура, модель данных, жизненный цикл карточки, деплой
- [docs/AGENT_INTEGRATION.md](docs/AGENT_INTEGRATION.md) — MCP-инструменты, API-токены, трейс и откат
- [docs/ROADMAP.md](docs/ROADMAP.md) — поэтапный план реализации

## Локальная разработка

Нужен запущенный **PostgreSQL** и база `moongatracker`. Строка подключения — в `.env`
(пример: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/moongatracker"`).

```bash
npm install
# один раз: создать базу в своём Postgres
#   psql -U postgres -c "CREATE DATABASE moongatracker;"
npx prisma migrate dev && npx prisma db seed   # схема + демо-доска с задачами (идемпотентно)
npx nx serve api    # http://localhost:3020/api  (GET /api/boards)
npx nx serve web    # http://localhost:4200      (проксирует /api на api)
```

## Docker (self-hosted)

Compose **не поднимает** Postgres — api подключается к уже работающему серверу БД
(через `host.docker.internal:5432`, база `moongatracker`). Строка подключения задаётся
в `docker-compose.yml` (`DATABASE_URL`).

```bash
docker compose up -d --build   # api на :3020
```

Контейнер при старте применяет миграции (`prisma migrate deploy`) и прогоняет
идемпотентный сид (создаёт демо-доску с задачами, если данных нет).

## Дальше

Phase 0 готов → следующий шаг — Phase 1 (MVP-доска): CRUD карточек, drag&drop,
комментарии, auth, Socket.IO. План — в [docs/ROADMAP.md](docs/ROADMAP.md).
