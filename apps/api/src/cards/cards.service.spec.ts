import { CardsService } from './cards.service';

describe('CardsService', () => {
  it('create() computes order as (max order in column) + 1', async () => {
    const created: Array<{ order: number }> = [];
    const fakePrisma = {
      card: {
        aggregate: async () => ({ _max: { order: 2 } }),
        create: async ({
          data,
        }: {
          data: { title: string; body: string | null; order: number };
        }) => {
          created.push(data);
          return {
            id: 'k9',
            title: data.title,
            body: data.body,
            priority: 0,
            order: data.order,
          };
        },
      },
    } as any;

    const service = new CardsService(fakePrisma);
    const result = await service.create({
      boardId: 'b1',
      columnKey: 'idea',
      title: 'X',
      body: null,
    } as any);

    expect(created[0].order).toBe(3);
    expect(result).toEqual({
      id: 'k9',
      title: 'X',
      body: null,
      priority: 0,
      order: 3,
      labels: [],
    });
  });

  it('create() starts order at 0 for an empty column', async () => {
    const fakePrisma = {
      card: {
        aggregate: async () => ({ _max: { order: null } }),
        create: async ({ data }: { data: { order: number } }) => ({
          id: 'k1',
          title: 't',
          body: null,
          priority: 0,
          order: data.order,
        }),
      },
    } as any;

    const service = new CardsService(fakePrisma);
    const result = await service.create({
      boardId: 'b1',
      columnKey: 'idea',
      title: 't',
    } as any);

    expect(result.order).toBe(0);
  });
});
