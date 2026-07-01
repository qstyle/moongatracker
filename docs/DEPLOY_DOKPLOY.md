# Деплой moongatracker в Dokploy

Образ собирается GitHub Actions и лежит в приватном Yandex Container Registry:
`cr.yandex/crpqt9tvu1olnk9ednbp/moongatracker:latest` (+ тег `sha-<short>`).
См. `docs/CICD_YC_REGISTRY.md`.

Один контейнер отдаёт и API, и SPA. Нужен внешний Postgres.

## Порт

| Что | Значение |
|-----|----------|
| Порт контейнера | **3020** (зашит в образ: `ENV PORT=3020`, слушает `0.0.0.0`) |
| API | `http://<host>:3020/api` |
| Веб-интерфейс (SPA) | `http://<host>:3020/` |

В Dokploy домен вешается на порт контейнера **3020**.

## Переменные окружения

| Переменная | Обяз. | Значение / примечание |
|-----------|:----:|----------------------|
| `DATABASE_URL` | **да** | `postgresql://<user>:<pass>@<host>:5432/<db>?schema=public`. При старте контейнер сам делает `prisma migrate deploy` и `prisma db seed`. |
| `JWT_SECRET` | **да** | Секрет для подписи JWT. По умолчанию в коде `dev-secret-moongatracker` — **обязательно переопределить** длинной случайной строкой. |
| `NODE_ENV` | нет | Уже `production` в образе. Отдельно задавать не нужно (именно он включает раздачу фронта). |
| `PORT` | нет | По умолчанию `3020`. Менять только если нужен другой внутренний порт. |
| `S3_BUCKET` | нет* | Бакет для вложений карточек. |
| `S3_ENDPOINT` | нет* | Endpoint S3 (напр. `https://storage.yandexcloud.net`). |
| `S3_REGION` | нет* | По умолчанию `us-east-1` (для YC Object Storage — `ru-central1`). |
| `S3_ACCESS_KEY` | нет* | Static access key. |
| `S3_SECRET_KEY` | нет* | Static secret key. |

\* S3 нужен **только** для функции вложений. Без него приложение стартует и работает, но загрузка файлов к карточкам не будет функционировать.

### Дефолтный логин (создаётся сидером на пустой базе)

`admin@moongatracker.local` / `moonga` — **сменить пароль после первого входа.**

## Шаги в Dokploy

### 1. Postgres

Создать Postgres-сервис (Dokploy → **Databases → Postgres**) или использовать внешний.
Из него взять `DATABASE_URL`.

> ⚠️ Убедиться, что у Postgres есть **персистентный том** на `/var/lib/postgresql/data`,
> иначе при пересоздании контейнера данные потеряются
> (аналогично [проблеме с Mongo в Dokploy] — Swarm выдаёт новый анонимный том).

### 2. Доступ к приватному реестру (pull)

YC CR приватный — Dokploy нужны креды на pull. Стандартный способ для автоматизации —
сервисный аккаунт + авторизованный ключ (`json_key`).

```bash
# сервисный аккаунт только на чтение образов
yc iam service-account create --name dokploy-moongatracker-puller     # -> <PULLER_SA_ID>
yc container registry add-access-binding crpqt9tvu1olnk9ednbp \
  --role container-registry.images.puller \
  --service-account-id <PULLER_SA_ID>
# авторизованный ключ (это и есть "пароль" для docker login)
yc iam key create --service-account-id <PULLER_SA_ID> \
  --output dokploy-puller-key.json
```

В Dokploy → **Settings → Registry → Add Registry**:
- Registry URL: `cr.yandex`
- Username: `json_key`
- Password: содержимое файла `dokploy-puller-key.json` (весь JSON)

### 3. Приложение

Dokploy → **Create → Application → Docker (Docker Image)**:
- Docker Image: `cr.yandex/crpqt9tvu1olnk9ednbp/moongatracker:latest`
- Registry: выбрать добавленный на шаге 2
- Port (Ports/Networking): контейнерный порт **3020**
- Environment: заполнить `DATABASE_URL`, `JWT_SECRET` (+ S3_* при необходимости)
- Domains: привязать домен → target port `3020`, включить HTTPS (Let's Encrypt)

Deploy. При старте применятся миграции и сид, затем поднимется сервис на `/api` + SPA на `/`.

### Фронт и домен

Отдельно фронт разворачивать **не нужно** — SPA раздаётся тем же контейнером на порту
`3020` (`/` → фронт, `/api` → бэкенд). Фронт ходит в API относительным путём `/api/...`,
websocket — через `location.origin`, т.е. всё **same-origin**. Ни `VITE_API_URL`, ни CORS,
ни второго домена не требуется.

Привязать один домен на target port `3020`, HTTPS on (Let's Encrypt), path `/`.
Canvas использует socket.io (WS) — Traefik в Dokploy пропускает WS-upgrade автоматически;
отдельная настройка обычно не нужна.

### 4. Обновление версии

Каждый push в `main` кладёт новый `:latest` (и `:sha-<short>`). В Dokploy жать **Redeploy**
(или подключить авто-деплой по вебхуку). Для отката указать конкретный тег `:sha-<short>`.

## Проверка после деплоя

- `https://<domain>/api` — отвечает NestJS.
- `https://<domain>/` — открывается SPA, логин `admin@moongatracker.local` / `moonga`.
- Логи контейнера: строки `prisma migrate deploy` без ошибок и `api listening on ... /api`.
