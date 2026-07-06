const DEFAULT_STAGES = [
  { key: 'discovery', title: 'Открытие' },
  { key: 'design', title: 'Дизайн и план' },
  { key: 'build', title: 'Сборка MVP' },
  { key: 'release', title: 'Релиз' },
  { key: 'operate', title: 'Эксплуатация' },
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
