// The 4 columns every new board starts with. "Тестируется" also counts as
// in-progress work in the roadmap dashboard's three buckets.
const DEFAULT_COLUMNS = [
  { title: 'Открыто', category: 'open' },
  { title: 'В работе', category: 'in_progress' },
  { title: 'Тестируется', category: 'in_progress' },
  { title: 'Закрыто', category: 'done' },
];

/** Rows for prisma.column.createMany when seeding a fresh board. */
export function buildDefaultColumns(boardId: string) {
  return DEFAULT_COLUMNS.map((c, i) => ({
    boardId,
    title: c.title,
    order: i,
    category: c.category,
  }));
}
