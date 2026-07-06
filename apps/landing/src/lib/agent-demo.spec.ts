import { buildAgentRun, sizeOf } from './agent-demo';

describe('agent-demo', () => {
  it('навешивает лейбл ui на идею про тему/интерфейс', () => {
    const run = buildAgentRun('Тёмная тема для настроек');
    expect(run.labels).toContain('ui');
    expect(run.from).toBe('idea');
    expect(run.to).toBe('разбор');
    expect(run.comment.length).toBeGreaterThan(0);
  });

  it('навешивает лейбл интеграции на идею про вебхук/telegram', () => {
    const run = buildAgentRun('Вебхук в Telegram на смену статуса');
    expect(run.labels).toContain('интеграции');
  });

  it('всегда добавляет лейбл оценки размера', () => {
    const run = buildAgentRun('Экспорт доски в Markdown');
    expect(run.labels.some((l) => l.startsWith('оценка:'))).toBe(true);
  });

  it('детерминирован: одинаковый вход → одинаковый выход', () => {
    expect(buildAgentRun('Экспорт в Markdown')).toEqual(buildAgentRun('Экспорт в Markdown'));
  });

  it('sizeOf растёт с длиной', () => {
    expect(sizeOf('коротко')).toBe('S');
    expect(sizeOf('a'.repeat(120))).toBe('L');
  });
});
