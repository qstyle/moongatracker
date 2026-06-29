import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const COLUMNS = [
  { key: 'idea', title: 'Идея', order: 0 },
  { key: 'triage', title: 'Разбор', order: 1 },
  { key: 'backlog', title: 'Бэклог', order: 2 },
  { key: 'in_dev', title: 'В разработке', order: 3 },
  { key: 'done', title: 'Готово', order: 4 },
];

async function main() {
  const existing = await prisma.board.findFirst({ where: { name: 'Главная' } });
  if (existing) return;
  await prisma.board.create({
    data: {
      name: 'Главная',
      columns: { create: COLUMNS },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
