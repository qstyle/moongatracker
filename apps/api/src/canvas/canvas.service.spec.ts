import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { CanvasService } from './canvas.service';

const user = { type: 'user', sub: 'u1' } as any;
const agent = { type: 'agent', projectId: 'p1', tokenId: 't1' } as any;

function makePrisma(overrides: any = {}) {
  return {
    membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    canvasNode: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    canvasEdge: { findMany: jest.fn().mockResolvedValue([]) },
    column: { findFirst: jest.fn() },
    card: { create: jest.fn(), findUnique: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _max: { order: null } }) },
    board: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(makePrisma(overrides))),
    ...overrides,
  } as any;
}

describe('CanvasService', () => {
  it('getCanvas: агент с токеном этого проекта — допускается', async () => {
    const prisma = makePrisma();
    const svc = new CanvasService(prisma);
    await expect(svc.getCanvas('p1', agent)).resolves.toEqual({ nodes: [], edges: [] });
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it('createNode: агент-токен отклоняется (мутации — только человек)', async () => {
    const prisma = makePrisma();
    const svc = new CanvasService(prisma);
    await expect(svc.createNode('p1', { x: 0, y: 0 }, agent)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createTaskFromNode: карточка падает в колонку с минимальным order', async () => {
    const prisma = makePrisma();
    prisma.canvasNode.findUnique.mockResolvedValue({ id: 'n1', projectId: 'p1', cardId: null, text: 'X' });
    prisma.board.findUnique.mockResolvedValue({ id: 'b1', projectId: 'p1' });
    prisma.column.findFirst.mockResolvedValue({ id: 'c1', title: 'Идеи', order: 0 });
    prisma.card.create.mockResolvedValue({ id: 'card1', boardId: 'b1', columnId: 'c1', title: 'X', priority: null });
    prisma.canvasNode.update.mockResolvedValue({
      id: 'n1', projectId: 'p1', text: 'X', x: 0, y: 0, width: 240, height: 120,
      color: null, cardId: 'card1', createdAt: new Date(), updatedAt: new Date(),
      card: { id: 'card1', boardId: 'b1', title: 'X', priority: null, column: { title: 'Идеи' } },
    });
    const svc = new CanvasService(prisma);
    const res = await svc.createTaskFromNode('n1', { boardId: 'b1' }, user);
    expect(prisma.column.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { boardId: 'b1' }, orderBy: { order: 'asc' } }),
    );
    expect(res.cardId).toBe('card1');
  });

  it('linkTask: карточка другого проекта — BadRequest', async () => {
    const prisma = makePrisma();
    prisma.canvasNode.findUnique.mockResolvedValue({ id: 'n1', projectId: 'p1', cardId: null });
    prisma.card.findUnique.mockResolvedValue({ id: 'card1', board: { projectId: 'OTHER' }, canvasNode: null });
    const svc = new CanvasService(prisma);
    await expect(svc.linkTask('n1', { cardId: 'card1' }, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('seed: идемпотентен — не сеет, если ноды уже есть', async () => {
    const prisma = makePrisma({ canvasNode: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(3), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() } });
    const svc = new CanvasService(prisma);
    await svc.seed('p1', user);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
