import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/moongatracker';
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter } as any);

const COLUMNS = [
  { title: 'Идея', order: 0 },
  { title: 'Разбор', order: 1 },
  { title: 'Бэклог', order: 2 },
  { title: 'В разработке', order: 3 },
  { title: 'Готово', order: 4 },
];

const CARDS = [
  {
    colTitle: 'Идея',
    title: 'Автотегирование отзывов по тону',
    body: 'Размечать отзывы как позитив/негатив.',
    order: 0,
    priority: null,
  },
  {
    colTitle: 'Идея',
    title: 'Еженедельный дайджест по понедельникам',
    body: null,
    order: 1,
    priority: null,
  },
  {
    colTitle: 'Разбор',
    title: 'Интеграция с MAX-мессенджером',
    body: 'Оценить объём.',
    order: 0,
    priority: 'normal',
  },
  {
    colTitle: 'Бэклог',
    title: 'Экспорт доски в CSV',
    body: null,
    order: 0,
    priority: 'low',
  },
  {
    colTitle: 'В разработке',
    title: 'Эндпоинт GET /api/projects',
    body: 'Первый вертикальный срез.',
    order: 0,
    priority: 'urgent',
  },
  {
    colTitle: 'Готово',
    title: 'Каркас Nx-монорепо',
    body: 'api + web + libs + Prisma.',
    order: 0,
    priority: null,
  },
];

async function main() {
  // 1. Upsert admin user
  const email = 'admin@moongatracker.local';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash('moonga', 10);
    user = await prisma.user.create({
      data: { email, passwordHash, name: 'Admin' },
    });
    console.log(`Created user: ${email}`);
  } else {
    console.log(`User exists: ${email}`);
  }

  // 2. Skip if project already exists
  const existingProject = await prisma.project.findFirst();
  if (existingProject) {
    console.log('Seed skipped: project already present.');
    return;
  }

  // 3. Create demo project + membership
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      memberships: { create: { userId: user.id } },
    },
  });
  console.log(`Created project: ${project.name}`);

  // 4. Create demo board with columns
  const board = await prisma.board.create({
    data: {
      projectId: project.id,
      name: 'Демо-доска',
      seq: 1,
      columns: { create: COLUMNS },
    },
    include: { columns: { orderBy: { order: 'asc' } } },
  });
  console.log(
    `Created board: ${board.name} with ${board.columns.length} columns`,
  );

  // 5. Build column title → id map
  const colMap = new Map(board.columns.map((c) => [c.title, c.id]));

  // 6. Create cards
  await prisma.card.createMany({
    data: CARDS.map((c, i) => ({
      boardId: board.id,
      columnId: colMap.get(c.colTitle)!,
      number: i + 1,
      title: c.title,
      body: c.body ?? null,
      priority: c.priority ?? null,
      authorType: 'user',
      authorId: user!.id,
      order: c.order,
    })),
  });
  console.log(`Created ${CARDS.length} cards`);
  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
