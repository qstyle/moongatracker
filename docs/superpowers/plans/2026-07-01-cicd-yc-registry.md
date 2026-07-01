# CI/CD YC Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** При push в `main` GitHub Actions собирает Docker-образ из существующего `Dockerfile` и пушит его в Yandex Container Registry под тегами `sha-<short>` и `latest`, аутентифицируясь через OIDC Workload Identity Federation (без статического ключа).

**Architecture:** Отдельный workflow `.github/workflows/publish-image.yml`, независимый от `ci.yml`. Логин в YC CR делает `yc-actions/yc-cr-login@v3` через WIF (`yc-sa-id` + `id-token: write`). Сборка/пуш — `docker/build-push-action@v6` с GHA-кэшем слоёв. Настройка на стороне YC (федерация, сервисный аккаунт, права) — разово вручную, задокументирована.

**Tech Stack:** GitHub Actions, Docker Buildx, Yandex Cloud Container Registry, yc-actions, YC IAM Workload Identity Federation.

---

## Файловая структура

- **Create:** `.github/workflows/publish-image.yml` — workflow сборки и пуша образа.
- **Create:** `docs/CICD_YC_REGISTRY.md` — инструкция по разовой настройке YC и секретов GitHub.
- Не трогаем: `.github/workflows/ci.yml`, `Dockerfile`, `.dockerignore`.

Обозначения-плейсхолдеры, которые владелец подставит при настройке YC (в код workflow НЕ попадают — идут через секреты):
- `<OWNER>` = `qstyle`
- `<REPO>` = `moongatracker`
- `<REGISTRY_ID>` — ID реестра (`crp...`), кладётся в секрет `YC_REGISTRY_ID`
- `<SA_ID>` — ID сервисного аккаунта (`aje...`), кладётся в секрет `YC_SA_ID`

---

### Task 1: Workflow публикации образа

**Files:**
- Create: `.github/workflows/publish-image.yml`

- [ ] **Step 1: Создать файл workflow**

Создать `.github/workflows/publish-image.yml` с содержимым:

```yaml
name: Publish image

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  id-token: write   # обязательно для GitHub OIDC (WIF-обмен)
  contents: read

concurrency:
  group: publish-image-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Yandex Container Registry (WIF)
        uses: yc-actions/yc-cr-login@v3
        with:
          yc-sa-id: ${{ secrets.YC_SA_ID }}

      - name: Docker meta (tags)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: cr.yandex/${{ secrets.YC_REGISTRY_ID }}/moongatracker
          tags: |
            type=sha,prefix=sha-,format=short
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Проверить YAML-синтаксис локально**

Run:
```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/publish-image.yml')); print('YAML OK')"
```
Expected: `YAML OK` (без трейсбэка).

- [ ] **Step 3: Проверить наличие actionlint (опционально, если установлен)**

Run:
```bash
command -v actionlint >/dev/null && actionlint .github/workflows/publish-image.yml && echo "actionlint OK" || echo "actionlint не установлен — пропускаем"
```
Expected: `actionlint OK` **или** `actionlint не установлен — пропускаем`. Не должно быть репортов об ошибках.

- [ ] **Step 4: Коммит**

```bash
git add .github/workflows/publish-image.yml
git commit -m "ci: workflow сборки образа и пуша в YC Registry через WIF"
```

---

### Task 2: Дока по настройке YC и секретов

**Files:**
- Create: `docs/CICD_YC_REGISTRY.md`

- [ ] **Step 1: Создать файл документации**

Создать `docs/CICD_YC_REGISTRY.md` с содержимым:

````markdown
# CI/CD → Yandex Container Registry

При push в `main` workflow `.github/workflows/publish-image.yml` собирает Docker-образ
и пушит его в Yandex Container Registry под тегами `sha-<short>` и `latest`.

Аутентификация — через **Workload Identity Federation (OIDC)**: статический ключ
сервисного аккаунта не хранится. `yc-actions/yc-cr-login@v3` обменивает GitHub
OIDC-токен на короткоживущий YC IAM-токен по ID сервисного аккаунта.

## Разовая настройка на стороне Yandex Cloud

Требуется установленный и авторизованный `yc` CLI (`yc init`). Подставьте свой
`<REGISTRY_ID>` (начинается с `crp...`).

```bash
# 1. Сервисный аккаунт для CI (или переиспользуйте существующий)
yc iam service-account create --name github-ci
#    Запомните ID из вывода -> <SA_ID> (aje...)

# 2. Право пуша образов в реестр
yc container registry add-access-binding <REGISTRY_ID> \
  --role container-registry.images.pusher \
  --service-account-id <SA_ID>

# 3. OIDC-федерация для GitHub Actions
yc iam workload-identity oidc federation create --name github-actions \
  --issuer "https://token.actions.githubusercontent.com" \
  --jwks-url "https://token.actions.githubusercontent.com/.well-known/jwks" \
  --audiences "https://github.com/qstyle"
#    Запомните ID из вывода -> <FEDERATION_ID>

# 4. Привязка субъекта GitHub (ветка main) к сервисному аккаунту
yc iam workload-identity federated-credential create \
  --service-account-id <SA_ID> \
  --federation-id <FEDERATION_ID> \
  --external-subject-id "repo:qstyle/moongatracker:ref:refs/heads/main"
```

Чтобы разрешить пуш и из других веток/тегов/окружений — добавьте отдельный
`federated-credential` с соответствующим `--external-subject-id`, например:
- ветка: `repo:qstyle/moongatracker:ref:refs/heads/<branch>`
- тег: `repo:qstyle/moongatracker:ref:refs/tags/<tag>`
- окружение: `repo:qstyle/moongatracker:environment:<env>`

## Секреты GitHub

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Секрет | Значение |
|--------|----------|
| `YC_SA_ID` | ID сервисного аккаунта из шага 1 (`aje...`) |
| `YC_REGISTRY_ID` | ID реестра (`crp...`) |

## Проверка

1. Смёржить/запушить в `main` (или запустить workflow вручную через
   Actions → **Publish image** → Run workflow).
2. Дождаться зелёного прогона `Publish image`.
3. Убедиться, что образ появился в реестре:
   ```bash
   yc container image list --registry-id <REGISTRY_ID>
   ```
   Ожидаемо: `cr.yandex/<REGISTRY_ID>/moongatracker` с тегами `sha-<short>` и `latest`.

## Грабли

- `permissions: id-token: write` в workflow обязателен — иначе GitHub не выпустит
  OIDC-токен и логин упадёт.
- `--audiences` федерации должен совпадать с `aud` OIDC-токена. По умолчанию GitHub
  выставляет `aud = https://github.com/qstyle` — федерацию создаём с этим значением.
- `--external-subject-id` должен точно совпадать с `sub` токена. Push из ветки, для
  которой нет federated-credential, будет отклонён на этапе логина.
- Путь образа всегда `cr.yandex/<REGISTRY_ID>/...` — используется ID реестра (`crp...`),
  а не человекочитаемое имя.
````

- [ ] **Step 2: Проверить, что Markdown читается и не содержит незакрытых блоков**

Run:
```bash
grep -c '```' docs/CICD_YC_REGISTRY.md
```
Expected: чётное число (все код-блоки закрыты).

- [ ] **Step 3: Коммит**

```bash
git add docs/CICD_YC_REGISTRY.md
git commit -m "docs: инструкция по настройке CI/CD и YC Container Registry"
```

---

### Task 3: Финальная проверка (после настройки YC владельцем)

> Этот таск выполняется **после** того, как владелец прогонит команды из
> `docs/CICD_YC_REGISTRY.md` и заведёт секреты `YC_SA_ID`, `YC_REGISTRY_ID`.

**Files:** нет изменений в коде.

- [ ] **Step 1: Запушить в main и дождаться прогона**

Убедиться, что push в `main` (или ручной `workflow_dispatch`) запускает workflow
**Publish image** и он завершается успешно (зелёный).

- [ ] **Step 2: Проверить образ в реестре**

Run:
```bash
yc container image list --registry-id <REGISTRY_ID>
```
Expected: присутствует репозиторий `moongatracker` с тегами `sha-<short-sha>` и `latest`.

- [ ] **Step 3: Проверить, что использован WIF, а не ключ**

В логах шага «Login to Yandex Container Registry (WIF)» не должно быть чтения
`yc-sa-json-credentials`; логин проходит по `yc-sa-id`. Ошибок
`missing ACTIONS_ID_TOKEN_REQUEST_URL` быть не должно (иначе забыт `id-token: write`).

---

## Self-Review

**Spec coverage:**
- «Триггер push в main + workflow_dispatch» → Task 1, Step 1 (`on:`). ✅
- «Права id-token: write» → Task 1, Step 1 (`permissions:`). ✅
- «WIF через yc-cr-login с yc-sa-id» → Task 1, Step 1 (шаг login). ✅
- «Теги sha-<short> и latest» → Task 1, Step 1 (`docker/metadata-action`). ✅
- «Build+push существующего Dockerfile с GHA-кэшем» → Task 1, Step 1 (`build-push-action`). ✅
- «Секреты YC_SA_ID, YC_REGISTRY_ID» → Task 2 (таблица секретов). ✅
- «Разовая настройка YC (федерация, SA, права)» → Task 2, Step 1. ✅
- «Критерии готовности (образ в реестре, WIF без ключа)» → Task 3. ✅

**Placeholder scan:** `<OWNER>/<REPO>/<REGISTRY_ID>/<SA_ID>/<FEDERATION_ID>` — не плейсхолдеры-заглушки плана, а значения окружения владельца; в код workflow они не попадают (идут через секреты GitHub). Все шаги содержат конечный контент. ✅

**Type consistency:** имена секретов (`YC_SA_ID`, `YC_REGISTRY_ID`), имя образа (`moongatracker`), теги (`sha-`, `latest`), имя workflow (`Publish image`) согласованы между Task 1, 2, 3. ✅
