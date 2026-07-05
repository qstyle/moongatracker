import { ForbiddenException } from '@nestjs/common';
import { CardsService } from './cards.service';

const NOW = new Date('2025-01-01T00:00:00.000Z');
const USER = { type: 'user', sub: 'u1' } as any;

// Authorization helpers resolve the board/project and check membership; every
// fakePrisma below provides a matching board + membership so create() is allowed.
const authMocks = {
  board: { findUnique: async () => ({ id: 'b1', projectId: 'p1' }) },
  membership: { findUnique: async () => ({ id: 'm1' }) },
};

describe('CardsService', () => {
  it('create() computes order (max+1 in column) and number (max+1 in board)', async () => {
    const created: Array<{ order: number; number: number }> = [];
    const fakePrisma = {
      ...authMocks,
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

    const service = new CardsService(fakePrisma, undefined as any, { emit: jest.fn() } as any);
    const result = await service.create(
      {
        boardId: 'b1',
        columnId: 'col1',
        title: 'X',
        body: null,
      } as any,
      USER,
    );

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
      ...authMocks,
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

    const service = new CardsService(fakePrisma, undefined as any, { emit: jest.fn() } as any);
    const result = await service.create(
      {
        boardId: 'b1',
        columnId: 'col1',
        title: 't',
      } as any,
      USER,
    );

    expect(result.order).toBe(0);
  });
});

describe('CardsService — project-scope authorization', () => {
  function makeService() {
    const prisma = {
      board: {
        findUnique: jest.fn().mockResolvedValue({ id: 'b1', projectId: 'p1' }),
      },
      card: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          board: { id: 'b1', projectId: 'p1' },
        }),
      },
    } as any;
    const activity = { record: jest.fn() } as any;
    const events = { emit: jest.fn() } as any;
    return new CardsService(prisma, activity, events);
  }

  it('rejects create from an agent scoped to another project', async () => {
    const svc = makeService();
    await expect(
      svc.create({ boardId: 'b1', columnId: 'col', title: 'x' } as any, {
        type: 'agent',
        projectId: 'other',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects reading a card from an agent scoped to another project', async () => {
    const svc = makeService();
    await expect(
      svc.getById('c1', { type: 'agent', projectId: 'other' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects deleting a card from an agent scoped to another project', async () => {
    const svc = makeService();
    await expect(
      svc.remove('c1', { type: 'agent', projectId: 'other' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
