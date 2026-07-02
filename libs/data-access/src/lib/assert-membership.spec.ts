import { ForbiddenException } from '@nestjs/common';
import { assertProjectAccess, RequestActor } from './assert-membership';

/** Minimal prisma stub: only membership.findUnique is exercised. */
function fakePrisma(memberships: Array<{ projectId: string; userId: string }>) {
  return {
    membership: {
      findUnique: ({
        where: { projectId_userId },
      }: {
        where: { projectId_userId: { projectId: string; userId: string } };
      }) =>
        Promise.resolve(
          memberships.find(
            (m) =>
              m.projectId === projectId_userId.projectId &&
              m.userId === projectId_userId.userId,
          ) ?? null,
        ),
    },
  } as any;
}

describe('assertProjectAccess', () => {
  describe('user-scoped agent token', () => {
    const actor: RequestActor = { type: 'agent', userId: 'u1', tokenId: 't1' };

    it('grants access to any project the owner is a member of', async () => {
      const prisma = fakePrisma([
        { projectId: 'pA', userId: 'u1' },
        { projectId: 'pB', userId: 'u1' },
      ]);
      await expect(
        assertProjectAccess(prisma, actor, 'pA'),
      ).resolves.toBeUndefined();
      await expect(
        assertProjectAccess(prisma, actor, 'pB'),
      ).resolves.toBeUndefined();
    });

    it('denies access to a project the owner is not a member of', async () => {
      const prisma = fakePrisma([{ projectId: 'pA', userId: 'u1' }]);
      await expect(assertProjectAccess(prisma, actor, 'pX')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('legacy single-project agent token', () => {
    const actor: RequestActor = { type: 'agent', projectId: 'pA', tokenId: 't1' };

    it('allows its own project', async () => {
      await expect(
        assertProjectAccess(fakePrisma([]), actor, 'pA'),
      ).resolves.toBeUndefined();
    });

    it('denies any other project', async () => {
      await expect(
        assertProjectAccess(fakePrisma([]), actor, 'pB'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  it('denies an agent token with no scope at all', async () => {
    const actor: RequestActor = { type: 'agent', tokenId: 't1' };
    await expect(
      assertProjectAccess(fakePrisma([]), actor, 'pA'),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('human user', () => {
    it('is allowed when a member and denied otherwise', async () => {
      const actor: RequestActor = { type: 'user', sub: 'u1' };
      await expect(
        assertProjectAccess(
          fakePrisma([{ projectId: 'pA', userId: 'u1' }]),
          actor,
          'pA',
        ),
      ).resolves.toBeUndefined();
      await expect(
        assertProjectAccess(fakePrisma([]), actor, 'pA'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
