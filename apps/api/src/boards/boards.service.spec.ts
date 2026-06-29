import { BoardsService } from './boards.service';

describe('BoardsService', () => {
  it('maps Prisma boards to BoardDto, grouping cards under their column by columnKey', async () => {
    const fakePrisma = {
      board: {
        findMany: async () => [
          {
            id: 'b1',
            name: 'Главная',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            columns: [
              { id: 'c1', key: 'idea', title: 'Идея', order: 0 },
              { id: 'c2', key: 'done', title: 'Готово', order: 1 },
            ],
            cards: [
              {
                id: 'k1',
                columnKey: 'idea',
                title: 'Карточка идеи',
                body: 'описание',
                priority: 0,
                order: 0,
              },
            ],
          },
        ],
      },
    } as any;

    const service = new BoardsService(fakePrisma);
    const result = await service.listBoards();

    expect(result).toEqual([
      {
        id: 'b1',
        name: 'Главная',
        createdAt: '2026-01-01T00:00:00.000Z',
        columns: [
          {
            id: 'c1',
            key: 'idea',
            title: 'Идея',
            order: 0,
            cards: [
              {
                id: 'k1',
                title: 'Карточка идеи',
                body: 'описание',
                priority: 0,
                order: 0,
              },
            ],
          },
          { id: 'c2', key: 'done', title: 'Готово', order: 1, cards: [] },
        ],
      },
    ]);
  });
});
