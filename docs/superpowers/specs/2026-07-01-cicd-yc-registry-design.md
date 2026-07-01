# CI/CD: сборка образа в GitHub Actions → пуш в Yandex Container Registry

**Дата:** 2026-07-01
**Репозиторий:** `qstyle/moongatracker` (GitHub)
**Скоуп:** только сборка и публикация Docker-образа. Деплой вне скоупа.

## Цель

При push в ветку `main` GitHub Actions собирает Docker-образ из существующего
`Dockerfile` (Nx-монорепо: `apps/api` + `apps/web` в одном образе) и пушит его в
Yandex Container Registry (YC CR) под тегами `sha-<short>` и `latest`.

Аутентификация в YC — через **Workload Identity Federation (OIDC)**, без хранения
статического ключа сервисного аккаунта в секретах.

## Ключевой факт (проверено)

`yc-actions/yc-cr-login@v3` умеет **сам** выполнять WIF-обмен GitHub OIDC-токена на
YC IAM-токен, если ему передать `yc-sa-id` (ID сервисного аккаунта). Отдельный шаг
обмена токена (`yc-iam-token-fed`) не нужен. Обязательное условие —
`permissions: id-token: write` на уровне job/workflow.

Источники:
- https://github.com/yc-actions/yc-cr-login (action.yml)
- https://yandex.cloud/ru/docs/tutorials/serverless/ci-cd-github-functions
- https://yandex.cloud/ru/docs/terraform/resources/iam_workload_identity_federated_credential

## Архитектура

```
push → main
   │
   ▼
GitHub Actions: .github/workflows/publish-image.yml
   │  permissions: id-token: write, contents: read
   ├─ actions/checkout@v4
   ├─ docker/setup-buildx-action@v3
   ├─ yc-actions/yc-cr-login@v3  (WIF: OIDC → IAM → docker login cr.yandex)
   │      with: yc-sa-id = ${{ secrets.YC_SA_ID }}
   ├─ docker/metadata-action@v5  → теги sha-<short>, latest
   └─ docker/build-push-action@v6
          Dockerfile (существующий, multi-stage)
          push: true → cr.yandex/${{ secrets.YC_REGISTRY_ID }}/moongatracker
          cache-from/to: type=gha
```

## Компоненты и решения

### 1. Workflow `.github/workflows/publish-image.yml`

- **Триггеры:** `push` в `main`; `workflow_dispatch` (ручной перезапуск).
- **Права:** `id-token: write` (обязательно для OIDC), `contents: read`.
- **Concurrency:** группа по ветке с `cancel-in-progress: true`, чтобы новый push
  отменял устаревшую сборку.
- **Шаги:** checkout → setup-buildx → yc-cr-login (WIF) → metadata-action →
  build-push-action.

### 2. Образ и теги

- Имя образа: `cr.yandex/<registry-id>/moongatracker`.
- Теги: `sha-<short-sha>` (иммутабельный, для трассировки) и `latest`
  (подвижный указатель на последний main).
- `<registry-id>` начинается с `crp...` — это **ID реестра**, а не имя репозитория.

### 3. Кэш сборки

- `docker/build-push-action@v6` с `cache-from: type=gha` и `cache-to: type=gha,mode=max`.
- Повторные сборки без изменений манифестов пропускают тяжёлые слои
  (`npm install`, `nx build api/web`).

### 4. Секреты GitHub

| Секрет | Значение | Назначение |
|--------|----------|-----------|
| `YC_SA_ID` | ID сервисного аккаунта (`aje...`) | вход в yc-cr-login (WIF) |
| `YC_REGISTRY_ID` | ID реестра (`crp...`) | путь пуша образа |

`YC_SA_ID` формально не является чувствительным, но хранится как секрет для единообразия.

### 5. Настройка на стороне YC (разово, вручную)

Документируется в `docs/CICD_YC_REGISTRY.md`:

```bash
# 1. Сервисный аккаунт для CI (или переиспользовать существующий)
yc iam service-account create --name github-ci                       # -> <SA_ID>

# 2. Право пуша в реестр
yc container registry add-access-binding <REGISTRY_ID> \
  --role container-registry.images.pusher --service-account-id <SA_ID>

# 3. OIDC-федерация для GitHub
yc iam workload-identity oidc federation create --name github-actions \
  --issuer "https://token.actions.githubusercontent.com" \
  --jwks-url "https://token.actions.githubusercontent.com/.well-known/jwks" \
  --audiences "https://github.com/qstyle"                            # -> <FEDERATION_ID>

# 4. Привязка субъекта (main) к сервисному аккаунту
yc iam workload-identity federated-credential create \
  --service-account-id <SA_ID> --federation-id <FEDERATION_ID> \
  --external-subject-id "repo:qstyle/moongatracker:ref:refs/heads/main"
```

## Грабли и допущения

- **`aud` федерации** должен совпадать с `aud` GitHub OIDC-токена. Дефолтный `aud`
  GitHub — `https://github.com/<owner>` = `https://github.com/qstyle`. Действия
  yc-actions не выставляют кастомный `audience`, значит используют дефолт — федерацию
  создаём с этим же audience.
- **`external-subject-id`** должен точно совпадать с `sub` токена. Для push в main это
  `repo:qstyle/moongatracker:ref:refs/heads/main`. При другой ветке/окружении обмен
  будет отклонён — нужен отдельный federated-credential.
- **`permissions: id-token: write`** обязательно, иначе OIDC-токен не выпустится.
- **Хостнейм реестра** — всегда `cr.yandex/<REGISTRY_ID>/...`, без указания региона.

## Вне скоупа

- Деплой образа (только build + push, по запросу).
- Гейт публикации на успех `ci.yml` (можно добавить позже через `workflow_run`).
- `CMD` в Dockerfile выполняет `prisma db seed` при каждом старте контейнера —
  прод-смелл, но в этой задаче не трогаем.

## Критерии готовности

1. Push в `main` запускает workflow `publish-image`.
2. Workflow логинится в YC CR по WIF без статического ключа.
3. Образ появляется в реестре с тегами `sha-<short>` и `latest`.
4. Дока `docs/CICD_YC_REGISTRY.md` содержит YC-команды и список секретов.
