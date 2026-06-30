import { CardsService } from './cards.service';

const NOW = new Date('2025-01-01T00:00:00.000Z');

describe('CardsService', () => {
  it('create() computes order (max+1 in column) and number (max+1 in board)', async () => {
    const created: Array<{ order: number; number: number }> = [];
    const fakePrisma = {
      card: {
        aggregate: async ({ _max }: { _max: { order?: boolean; number?: boolean } }) =>
          _max.number ? { _max: { number: 7 } } : { _max: { order: 2 } },
        create: async ({
          data,
        }: {
          data: { title: string; body: string | null; order: number; number: number };
        }) => {
          created.push(data);
          return {
            id: 'k9',
            boardId: 'b1',
            columnId: 'col1',
            number: data.number,
            title: data.title,
            body: data.body,
            priority: null,
            authorType: 'user',
            authorId: null,
            assigneeType: null,
            assigneeId: null,
            order: data.order,
            createdAt: NOW,
            updatedAt: NOW,
          };
        },
      },
      $transaction: async (fn: any) => fn(fakePrisma),
    } as any;

    const service = new CardsService(fakePrisma);
    const result = await service.create({
      boardId: 'b1',
      columnId: 'col1',
      title: 'X',
      body: null,
    } as any);

    expect(created[0].order).toBe(3);
    expect(created[0].number).toBe(8);
    expect(result).toEqual({
      id: 'k9',
      boardId: 'b1',
      columnId: 'col1',
      number: 8,
      title: 'X',
      body: null,
      priority: null,
      author: { type: 'user', id: null, name: null },
      assignee: null,
      attachmentCount: 0,
      order: 3,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it('create() starts order at 0 for an empty column', async () => {
    const fakePrisma = {
      card: {
        aggregate: async () => ({ _max: { order: null, number: null } }),
        create: async ({ data }: { data: { order: number; number: number } }) => ({
          id: 'k1',
          boardId: 'b1',
          columnId: 'col1',
          number: data.number,
          title: 't',
          body: null,
          priority: null,
          authorType: 'user',
          authorId: null,
          assigneeType: null,
          assigneeId: null,
          order: data.order,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      },
      $transaction: async (fn: any) => fn(fakePrisma),
    } as any;

    const service = new CardsService(fakePrisma);
    const result = await service.create({
      boardId: 'b1',
      columnId: 'col1',
      title: 't',
    } as any);

    expect(result.order).toBe(0);
  });
});
