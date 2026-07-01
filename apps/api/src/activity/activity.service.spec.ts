import { ForbiddenException } from '@nestjs/common';
import { ActivityService } from './activity.service';

describe('ActivityService — agent-token authorization', () => {
  const card = { id: 'c1', board: { projectId: 'p1' } };

  function makeService() {
    const prisma = {
      card: { findUnique: jest.fn().mockResolvedValue(card) },
      membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
      activity: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    return { service: new ActivityService(prisma), prisma };
  }

  it('lets an agent token read activity for a card in its project', async () => {
    const { service, prisma } = makeService();
    const result = await service.listForCard('c1', {
      type: 'agent',
      projectId: 'p1',
    } as any);
    expect(result).toEqual([]);
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an agent token from another project', async () => {
    const { service } = makeService();
    await expect(
      service.listForCard('c1', { type: 'agent', projectId: 'other' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
