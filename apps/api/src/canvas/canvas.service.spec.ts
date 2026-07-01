import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { CanvasService } from './canvas.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma(overrides: Record<string, any> = {}) {
  const prisma: any = {
    membership: {
      findUnique: jest.fn().mockResolvedValue({ id: 'm1' }),
    },
    canvas: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    card: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest
        .fn()
        .mockResolvedValue({ _max: { order: null, number: null } }),
      create: jest.fn(),
    },
    board: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    column: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
  // $transaction calls the callback with the same mock
  prisma.$transaction = jest.fn((fn: (tx: any) => any) => fn(prisma));
  return prisma;
}

const humanUser = { type: 'user', sub: 'user1' };
const agentUser = { type: 'agent', projectId: 'project1', tokenId: 'tok1' };
const agentWrong = { type: 'agent', projectId: 'other-project', tokenId: 'tok2' };

// ---------------------------------------------------------------------------
// 1. getCanvas — agent access + starter doc
// ---------------------------------------------------------------------------

describe('getCanvas', () => {
  it('allows agent scoped to the same project without calling membership.findUnique', async () => {
    const prisma = makePrisma();
    const service = new CanvasService(prisma as any);

    const result = await service.getCanvas('project1', agentUser);

    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
    // Should return starter doc (nodes array non-empty)
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it('rejects agent scoped to a different project', async () => {
    const prisma = makePrisma();
    const service = new CanvasService(prisma as any);

    await expect(service.getCanvas('project1', agentWrong)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns starter doc when no canvas row exists (human user)', async () => {
    const prisma = makePrisma();
    prisma.canvas.findUnique = jest.fn().mockResolvedValue(null);
    const service = new CanvasService(prisma as any);

    const result = await service.getCanvas('project1', humanUser);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  it('resolves linked card into data.card', async () => {
    const card = {
      id: 'card1',
      boardId: 'board1',
      title: 'My Task',
      priority: 'high',
      column: { title: 'In Progress' },
    };
    const prisma = makePrisma({
      canvas: {
        findUnique: jest.fn().mockResolvedValue({
          data: {
            nodes: [
              {
                id: 'n1',
                type: 'markdown',
                position: { x: 0, y: 0 },
                data: { text: 'hello', cardId: 'card1' },
              },
            ],
            edges: [],
          },
        }),
      },
      card: {
        findMany: jest.fn().mockResolvedValue([card]),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _max: { order: null, number: null } }),
        create: jest.fn(),
      },
    });
    const service = new CanvasService(prisma as any);

    const result = await service.getCanvas('project1', humanUser);

    expect(result.nodes[0].data.card).toMatchObject({
      id: 'card1',
      boardId: 'board1',
      title: 'My Task',
      columnTitle: 'In Progress',
      priority: 'high',
    });
    expect(result.nodes[0].data.cardId).toBe('card1');
  });

  it('sets cardId=null and card=null when card is not found (dangling)', async () => {
    const prisma = makePrisma({
      canvas: {
        findUnique: jest.fn().mockResolvedValue({
          data: {
            nodes: [
              {
                id: 'n1',
                type: 'markdown',
                position: { x: 0, y: 0 },
                data: { text: 'hello', cardId: 'missing-card' },
              },
            ],
            edges: [],
          },
        }),
      },
      card: {
        findMany: jest.fn().mockResolvedValue([]), // card not found
        aggregate: jest
          .fn()
          .mockResolvedValue({ _max: { order: null, number: null } }),
        create: jest.fn(),
      },
    });
    const service = new CanvasService(prisma as any);

    const result = await service.getCanvas('project1', humanUser);

    expect(result.nodes[0].data.cardId).toBeNull();
    expect(result.nodes[0].data.card).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. saveCanvas — agent forbidden + strip data.card
// ---------------------------------------------------------------------------

describe('saveCanvas', () => {
  it('throws ForbiddenException for agent users', async () => {
    const prisma = makePrisma();
    const service = new CanvasService(prisma as any);

    await expect(
      service.saveCanvas('project1', agentUser, { nodes: [], edges: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('strips data.card before upsert', async () => {
    const prisma = makePrisma();
    const service = new CanvasService(prisma as any);

    const doc = {
      nodes: [
        {
          id: 'n1',
          type: 'markdown',
          position: { x: 0, y: 0 },
          data: {
            text: 'hello',
            cardId: 'card1',
            card: { id: 'card1', boardId: 'b1', title: 'T', columnTitle: 'Col', priority: null },
          },
        },
      ],
      edges: [],
    };

    await service.saveCanvas('project1', humanUser, doc);

    expect(prisma.canvas.upsert).toHaveBeenCalledTimes(1);
    const callArg = prisma.canvas.upsert.mock.calls[0][0];
    const savedNode = callArg.create.data.nodes[0];
    expect(savedNode.data).not.toHaveProperty('card');
    expect(savedNode.data.cardId).toBe('card1');
  });

  it('calls upsert with correct projectId and returns { ok: true }', async () => {
    const prisma = makePrisma();
    const service = new CanvasService(prisma as any);

    const result = await service.saveCanvas('project1', humanUser, { nodes: [], edges: [] });

    expect(result).toEqual({ ok: true });
    expect(prisma.canvas.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'project1' } }),
    );
  });
});

// ---------------------------------------------------------------------------
// 3. createTaskFromNode — number=max+1, first column, board validation
// ---------------------------------------------------------------------------

describe('createTaskFromNode', () => {
  function makeSetupPrisma(boardProjectId: string = 'project1') {
    const board = { id: 'board1', projectId: boardProjectId, title: 'Board' };
    const column = { id: 'col1', boardId: 'board1', title: 'To Do', order: 0 };
    const prisma = makePrisma({
      board: { findUnique: jest.fn().mockResolvedValue(board) },
      column: { findFirst: jest.fn().mockResolvedValue(column) },
      card: {
        aggregate: jest.fn().mockResolvedValue({ _max: { order: 5, number: 7 } }),
        create: jest.fn().mockResolvedValue({
          id: 'card-new',
          boardId: 'board1',
          columnId: 'col1',
          title: 'My node text',
          priority: null,
          number: 8,
          order: 6,
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      canvas: {
        findUnique: jest.fn().mockResolvedValue({
          data: {
            nodes: [
              {
                id: 'node-x',
                type: 'markdown',
                position: { x: 0, y: 0 },
                data: { text: 'My node text\nsome more content' },
              },
            ],
            edges: [],
          },
        }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    });
    return prisma;
  }

  it('creates card with number=max+1 in first column and returns cardId + card', async () => {
    const prisma = makeSetupPrisma();
    const service = new CanvasService(prisma as any);

    const result = await service.createTaskFromNode('project1', 'node-x', 'board1', humanUser);

    expect(result.cardId).toBe('card-new');
    expect(result.card).toMatchObject({
      id: 'card-new',
      boardId: 'board1',
      title: 'My node text',
      columnTitle: 'To Do',
      priority: null,
    });

    // Check the card.create was called with number = max+1 = 8, order = max+1 = 6
    const createCall = prisma.card.create.mock.calls[0][0];
    expect(createCall.data.number).toBe(8);
    expect(createCall.data.order).toBe(6);
    expect(createCall.data.columnId).toBe('col1');
    expect(createCall.data.authorType).toBe('user');
    expect(createCall.data.authorId).toBe('user1');
  });

  it('uses first line of node text (stripped of markdown header) as title', async () => {
    const prisma = makeSetupPrisma();
    const service = new CanvasService(prisma as any);

    await service.createTaskFromNode('project1', 'node-x', 'board1', humanUser);

    const createCall = prisma.card.create.mock.calls[0][0];
    // title is first line of "My node text\nsome more content"
    expect(createCall.data.title).toBe('My node text');
  });

  it('throws BadRequestException when board belongs to another project', async () => {
    const prisma = makeSetupPrisma('other-project');
    const service = new CanvasService(prisma as any);

    await expect(
      service.createTaskFromNode('project1', 'node-x', 'board1', humanUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when board has no columns', async () => {
    const prisma = makeSetupPrisma();
    prisma.column.findFirst = jest.fn().mockResolvedValue(null);
    const service = new CanvasService(prisma as any);

    await expect(
      service.createTaskFromNode('project1', 'node-x', 'board1', humanUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ForbiddenException for agent users on createTaskFromNode', async () => {
    const prisma = makeSetupPrisma();
    const service = new CanvasService(prisma as any);

    await expect(
      service.createTaskFromNode('project1', 'node-x', 'board1', agentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
