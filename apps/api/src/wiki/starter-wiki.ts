import { Prisma } from '@prisma/client';

interface StarterSection {
  title: string;
  pages: { title: string; body: string }[];
}

/** Минимальный стартовый набор вики, засеваемый при создании проекта. */
export const STARTER_WIKI: StarterSection[] = [
  {
    title: 'Документация',
    pages: [
      {
        title: 'Обзор',
        body: '# Обзор\n\nКоротко о проекте: что это и зачем.\n',
      },
      {
        title: 'Архитектура',
        body: '# Архитектура\n\nКомпоненты, потоки данных, ключевые решения.\n',
      },
    ],
  },
  {
    title: 'Рабочее',
    pages: [
      {
        title: 'Заметки агента',
        body: '# Заметки агента\n\nРабочие заметки AI-агента по ходу работы.\n',
      },
      {
        title: 'Решения (ADR)',
        body: '# Решения (ADR)\n\nЗафиксированные архитектурные решения и их контекст.\n',
      },
    ],
  },
];

/**
 * Засевает стартовые разделы и страницы вики для проекта.
 * Принимает Prisma-транзакцию (или сам PrismaService), чтобы вызываться
 * как из `projects.create()`, так и из эндпоинта seed.
 */
export async function buildStarterWiki(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<void> {
  for (let s = 0; s < STARTER_WIKI.length; s++) {
    const section = await tx.wikiSection.create({
      data: { projectId, title: STARTER_WIKI[s].title, order: s },
    });
    await tx.wikiPage.createMany({
      data: STARTER_WIKI[s].pages.map((page, order) => ({
        sectionId: section.id,
        title: page.title,
        body: page.body,
        order,
        authorType: 'user',
      })),
    });
  }
}
