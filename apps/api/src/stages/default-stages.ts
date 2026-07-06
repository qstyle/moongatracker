const DEFAULT_STAGES = [
  { key: 'idea', title: 'Идея' },
  { key: 'validate', title: 'Валидация' },
  { key: 'design', title: 'Дизайн' },
  { key: 'build', title: 'Разработка' },
  { key: 'launch', title: 'Запуск' },
  { key: 'prod', title: 'Прод' },
];

/** Rows for prisma.stage.createMany — the first stage starts active. */
export function buildDefaultStages(projectId: string) {
  return DEFAULT_STAGES.map((s, i) => ({
    projectId,
    key: s.key,
    title: s.title,
    order: i,
    status: i === 0 ? 'active' : 'not_started',
  }));
}
