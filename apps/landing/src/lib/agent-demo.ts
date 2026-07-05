export type ColumnKey = 'idea' | 'разбор';

export interface AgentRun {
  comment: string;
  labels: string[];
  from: ColumnKey;
  to: ColumnKey;
}

const RULES: { label: string; words: string[] }[] = [
  { label: 'ui', words: ['тём', 'тема', 'интерфейс', 'ui', 'экран', 'кнопк'] },
  { label: 'интеграции', words: ['вебхук', 'webhook', 'telegram', 'уведомл', 'api', 'mcp', 'бот'] },
  { label: 'экспорт', words: ['экспорт', 'markdown', 'выгруз', 'csv', 'импорт'] },
  { label: 'bug', words: ['баг', 'фикс', 'ошибк', 'падает', 'не работает'] },
];

export function sizeOf(text: string): 'S' | 'M' | 'L' {
  const n = text.trim().length;
  if (n <= 40) return 'S';
  if (n <= 90) return 'M';
  return 'L';
}

export function detectLabels(text: string): string[] {
  const t = text.toLowerCase();
  const hits = RULES.filter((r) => r.words.some((w) => t.includes(w))).map((r) => r.label);
  return hits.length ? hits : ['фича'];
}

export function buildAgentRun(text: string): AgentRun {
  const size = sizeOf(text);
  const labels = [...detectLabels(text), `оценка: ${size}`];
  const comment =
    `Разобрал идею. Навесил лейблы: ${labels.join(', ')}. ` +
    `Предлагаю оформить критерии приёмки и оценить в ${size}. ` +
    `Двигаю в «Разбор» — подтвердишь перенос в разработку?`;
  return { comment, labels, from: 'idea', to: 'разбор' };
}
