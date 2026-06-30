import { CardsService } from './cards.service';

const NOW = new Date('2025-01-01T00:00:00.000Z');

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
            projectId: 'p1',
            columnId: 'col1',
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
    } as any;

    const service = new CardsService(fakePrisma);
    const result = await service.create({
      projectId: 'p1',
      columnId: 'col1',
      title: 'X',
      body: null,
    } as any);

    expect(created[0].order).toBe(3);
    expect(result).toEqual({
      id: 'k9',
      projectId: 'p1',
      columnId: 'col1',
      title: 'X',
      body: null,
      priority: null,
      author: { type: 'user', id: null, name: null },
      assignee: null,
      order: 3,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it('create() starts order at 0 for an empty column', async () => {
    const fakePrisma = {
      card: {
        aggregate: async () => ({ _max: { order: null } }),
        create: async ({ data }: { data: { order: number } }) => ({
          id: 'k1',
          projectId: 'p1',
          columnId: 'col1',
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
    } as any;

    const service = new CardsService(fakePrisma);
    const result = await service.create({
      projectId: 'p1',
      columnId: 'col1',
      title: 't',
    } as any);

    expect(result.order).toBe(0);
  });
});
