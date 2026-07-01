import { ForbiddenException } from '@nestjs/common';
import { BoardsService } from './boards.service';

describe('BoardsService — agent-token authorization', () => {
  const boardRows = [
    { id: 'b1', projectId: 'p1', name: 'Board', seq: 1, createdAt: new Date() },
  ];

  function makeService(overrides: any = {}) {
    const prisma = {
      board: { findMany: jest.fn().mockResolvedValue(boardRows) },
      membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
      ...overrides,
    } as any;
    return { service: new BoardsService(prisma), prisma };
  }

  it('lets an agent token list boards of the project it is scoped to', async () => {
    const { service, prisma } = makeService();
    const result = await service.listForProject('p1', {
      type: 'agent',
      projectId: 'p1',
    } as any);
    expect(result).toHaveLength(1);
    // agents authorize by token scope, not membership lookup
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an agent token scoped to a different project', async () => {
    const { service } = makeService();
    await expect(
      service.listForProject('p1', {
        type: 'agent',
        projectId: 'other',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('still checks membership for a human user', async () => {
    const { service, prisma } = makeService();
    await service.listForProject('p1', { type: 'user', sub: 'u1' } as any);
    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: 'p1', userId: 'u1' } },
    });
  });
});
