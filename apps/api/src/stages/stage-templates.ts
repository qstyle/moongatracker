export type StageKey = 'discovery' | 'design' | 'build' | 'release' | 'operate';

export interface StageTemplate {
  backlogCards: { title: string; body?: string }[];
  wikiPages: { title: string; body: string }[];
  tools: { name: string; url: string; note?: string }[];
  links: { title: string; url: string }[];
}

/** Human-readable exit-criteria hint per stage (shown before advancing). */
export const STAGE_EXIT_CRITERIA: Record<StageKey, string> = {
  discovery: 'Одни и те же боли повторяются в 3+ интервью; принято решение GO / PIVOT / KILL.',
  design: 'Выбран один вариант решения, задача «concrete enough», задан таймбокс (аппетит) и scope MVP.',
  build: 'Feature-freeze: MVP feature-complete, критичные пути покрыты тестами.',
  release: 'Пройдены alpha→beta→GA, нет showstopper-багов, чеклист релиза закрыт.',
  operate: 'Финального гейта нет — этап конечный (мониторинг, поддержка, итерации).',
};

export const STAGE_TEMPLATES: Record<StageKey, StageTemplate> = {
  discovery: {
    backlogCards: [
      { title: 'Сформулировать гипотезу проблемы', body: 'Кого и какую боль решаем — одно предложение.' },
      { title: 'Составить гайд для интервью (Mom Test)', body: 'Вопросы про прошлое и факты, не про будущее и мнения.' },
      { title: 'Провести 5+ проблемных интервью' },
      { title: 'Свести инсайты в affinity-карту' },
      { title: 'Приоритизировать топ-3–5 болей' },
      { title: 'Принять решение GO / PIVOT / KILL' },
    ],
    wikiPages: [
      { title: 'Карта проблемы', body: '# Карта проблемы\n\n## Кого решаем (персоны)\n\n## Боль\n\n## Гипотеза\n' },
      { title: 'Инсайты интервью', body: '# Инсайты интервью\n\n| Кто | Инсайт | Цитата |\n|---|---|---|\n' },
      { title: 'Решение GO / PIVOT / KILL', body: '# Решение\n\n- Итог: \n- Обоснование: \n' },
    ],
    tools: [
      { name: 'Notion', url: 'https://notion.so', note: 'заметки, синтез инсайтов' },
      { name: 'Google Meet / Zoom', url: 'https://meet.google.com', note: 'интервью' },
      { name: 'tl;dv / Otter.ai', url: 'https://tldv.io', note: 'запись и транскрипты интервью' },
      { name: 'Dovetail', url: 'https://dovetail.com', note: 'affinity-карта, теги инсайтов' },
    ],
    links: [
      { title: 'The Mom Test (как говорить с юзерами)', url: 'https://www.momtestbook.com/' },
      { title: 'YC — How to talk to users', url: 'https://www.ycombinator.com/library/6g-how-to-talk-to-users' },
      { title: 'Teresa Torres — Continuous Discovery', url: 'https://www.producttalk.org/' },
    ],
  },
  design: {
    backlogCards: [
      { title: 'Переформулировать задачу (design challenge)' },
      { title: 'Сгенерировать 2–3 варианта решения' },
      { title: 'Собрать кликабельный прототип' },
      { title: 'Проверить прототип на 3–5 юзерах' },
      { title: 'Написать PRD' },
      { title: 'Задать аппетит (таймбокс) и нарезать scope MVP' },
    ],
    wikiPages: [
      { title: 'PRD', body: '# PRD\n\n## Проблема\n\n## Решение\n\n## Метрика успеха\n\n## Вне scope\n' },
      { title: 'Варианты решений и выбор', body: '# Варианты\n\n1. \n2. \n\n## Выбор и почему\n' },
      { title: 'Scope и аппетит MVP', body: '# Scope MVP\n\n- Аппетит (таймбокс): \n- В scope: \n- НЕ в scope: \n' },
    ],
    tools: [
      { name: 'Figma', url: 'https://figma.com', note: 'макеты и прототип' },
      { name: 'Excalidraw', url: 'https://excalidraw.com', note: 'быстрые схемы/флоу' },
      { name: 'Maze', url: 'https://maze.co', note: 'тест прототипа на юзерах' },
    ],
    links: [
      { title: 'Marty Cagan — Inspired (product discovery)', url: 'https://www.svpg.com/inspired-how-to-create-products-customers-love/' },
      { title: 'Shape Up — Appetite & Shaping', url: 'https://basecamp.com/shapeup/1.2-chapter-03' },
      { title: 'Google Design Sprint Kit', url: 'https://designsprintkit.withgoogle.com/' },
    ],
  },
  build: {
    backlogCards: [
      { title: 'Настроить репозиторий и окружение (CI)' },
      { title: 'Спроектировать схему данных' },
      { title: 'Реализовать ядро MVP (scope)' },
      { title: 'Написать автотесты на критичные пути' },
      { title: 'Довести до feature-complete (feature-freeze)' },
    ],
    wikiPages: [
      { title: 'Архитектура', body: '# Архитектура\n\nКомпоненты, потоки данных, ключевые решения.\n' },
      { title: 'Решения (ADR)', body: '# ADR\n\n## ADR-1: \n- Контекст: \n- Решение: \n- Последствия: \n' },
      { title: 'Тех-долг', body: '# Тех-долг\n\n- [ ] \n' },
    ],
    tools: [
      { name: 'Cursor / Claude Code', url: 'https://cursor.com', note: 'AI-ассистированная разработка' },
      { name: 'GitHub', url: 'https://github.com', note: 'репозиторий + CI (Actions)' },
      { name: 'Supabase / Neon', url: 'https://supabase.com', note: 'БД + auth быстро' },
      { name: 'Vercel / Railway', url: 'https://vercel.com', note: 'хостинг MVP' },
    ],
    links: [
      { title: 'The Twelve-Factor App', url: 'https://12factor.net/' },
      { title: 'Shape Up — Scope hammering', url: 'https://basecamp.com/shapeup/3.4-chapter-13' },
      { title: 'Dual-track agile (delivery)', url: 'https://www.svpg.com/dual-track-agile/' },
    ],
  },
  release: {
    backlogCards: [
      { title: 'Внутренний alpha-тест' },
      { title: 'Закрытая beta с реальными юзерами' },
      { title: 'Починить блокеры (showstoppers)' },
      { title: 'Подготовить чеклист релиза' },
      { title: 'Выкатить GA (публичный релиз)' },
    ],
    wikiPages: [
      { title: 'Чеклист релиза', body: '# Чеклист релиза\n\n- [ ] Мониторинг включён\n- [ ] Бэкапы\n- [ ] Онбординг/лендинг\n- [ ] Прайсинг\n' },
      { title: 'Известные баги', body: '# Известные баги\n\n| Баг | Severity | Статус |\n|---|---|---|\n' },
      { title: 'План выката (alpha/beta/GA)', body: '# План выката\n\n- alpha: \n- beta: \n- GA: \n' },
    ],
    tools: [
      { name: 'TestFlight / Firebase App Distribution', url: 'https://developer.apple.com/testflight/', note: 'бета-раздача' },
      { name: 'Flagsmith / ConfigCat', url: 'https://flagsmith.com', note: 'feature flags / canary' },
      { name: 'Sentry', url: 'https://sentry.io', note: 'ошибки на релизе' },
      { name: 'Product Hunt', url: 'https://producthunt.com', note: 'публичный лонч' },
    ],
    links: [
      { title: 'Software Release Life Cycle (alpha/beta/GA)', url: 'https://en.wikipedia.org/wiki/Software_release_life_cycle' },
      { title: 'Canary release with feature flags', url: 'https://configcat.com/blog/how-to-implement-a-canary-release-with-feature-flags/' },
    ],
  },
  operate: {
    backlogCards: [
      { title: 'Настроить мониторинг и алерты' },
      { title: 'Настроить сбор продуктовых метрик' },
      { title: 'Наладить канал поддержки/фидбека' },
      { title: 'Написать runbook инцидентов' },
      { title: 'Собрать инсайты → спланировать следующий виток' },
    ],
    wikiPages: [
      { title: 'Runbook', body: '# Runbook\n\n## Инцидент: шаги\n\n## Контакты/доступы\n' },
      { title: 'Метрики / SLO', body: '# Метрики\n\n- North Star: \n- SLO аптайма: \n' },
      { title: 'Обратная связь и идеи', body: '# Фидбек и идеи\n\n- \n' },
    ],
    tools: [
      { name: 'Sentry / Grafana', url: 'https://grafana.com', note: 'observability, дашборды' },
      { name: 'PostHog / Plausible', url: 'https://posthog.com', note: 'продуктовая аналитика' },
      { name: 'Crisp / Intercom', url: 'https://crisp.chat', note: 'поддержка и фидбек' },
      { name: 'UptimeRobot', url: 'https://uptimerobot.com', note: 'мониторинг аптайма' },
    ],
    links: [
      { title: 'Google SRE — SLO', url: 'https://sre.google/sre-book/service-level-objectives/' },
      { title: 'PostHog — product analytics guide', url: 'https://posthog.com/product-analytics' },
    ],
  },
};

/** Renders the tools+links of a template into one markdown wiki page body. */
export function renderToolsLinksPage(t: StageTemplate): string {
  const tools = t.tools.map((x) => `- [${x.name}](${x.url})${x.note ? ' — ' + x.note : ''}`).join('\n');
  const links = t.links.map((x) => `- [${x.title}](${x.url})`).join('\n');
  return `# Инструменты и ссылки\n\n## Рекомендованные инструменты\n\n${tools}\n\n## Полезные ссылки\n\n${links}\n`;
}
