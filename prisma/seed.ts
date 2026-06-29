import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/moongatracker';
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const COLUMNS = [
  { key: 'idea', title: 'Идея', order: 0 },
  { key: 'triage', title: 'Разбор', order: 1 },
  { key: 'backlog', title: 'Бэклог', order: 2 },
  { key: 'in_dev', title: 'В разработке', order: 3 },
  { key: 'done', title: 'Готово', order: 4 },
];

const CARDS = [
  {
    columnKey: 'idea',
    title: 'Автотегирование отзывов по тону',
    body: 'Размечать отзывы как позитив/негатив для дайджеста.',
    order: 0,
  },
  {
    columnKey: 'idea',
    title: 'Еженедельный дайджест по понедельникам',
    body: null,
    order: 1,
  },
  {
    columnKey: 'triage',
    title: 'Интеграция с MAX-мессенджером',
    body: 'Оценить объём, нужен ли отдельный воркер.',
    order: 0,
  },
  {
    columnKey: 'backlog',
    title: 'Экспорт доски в CSV',
    body: null,
    order: 0,
  },
  {
    columnKey: 'in_dev',
    title: 'Эндпоинт GET /api/boards',
    body: 'Первый вертикальный срез.',
    order: 0,
  },
  {
    columnKey: 'done',
    title: 'Каркас Nx-монорепо',
    body: 'api + web + libs + Prisma.',
    order: 0,
  },
];

async function seedUser() {
  const email = 'admin@moongatracker.local';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const passwordHash = await bcrypt.hash('moonga', 10);
  await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'admin' },
  });
  console.log(`Seeded user ${email} (password: moonga).`);
}

async function main() {
  await seedUser();

  const existing = await prisma.board.findFirst();
  if (existing) {
    console.log('Seed skipped: board already present.');
    return;
  }

  const board = await prisma.board.create({
    data: {
      name: 'Демо-доска',
      columns: { create: COLUMNS },
    },
  });

  await prisma.card.createMany({
    data: CARDS.map((c) => ({ ...c, boardId: board.id })),
  });

  console.log(`Seeded board "${board.name}" with ${CARDS.length} cards.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
