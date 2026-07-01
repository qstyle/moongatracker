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
