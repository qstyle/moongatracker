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
