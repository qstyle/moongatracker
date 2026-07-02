import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

export async function assertMembership(
  prisma: PrismaService,
  userId: string,
  projectId: string,
): Promise<void> {
  const m = await prisma.membership.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!m) throw new ForbiddenException('Not a member of this organization');
}

/** The authenticated subject attached to the request by UnifiedAuthGuard. */
export type RequestActor =
  | { type: 'user'; sub: string; email?: string }
  | {
      type: 'agent';
      /** Owner of the token. When set, the token can access all of this user's
       * projects (checked via membership). */
      userId?: string | null;
      /** Legacy single-project anchor (tokens minted before user-scoping). */
      projectId?: string | null;
      tokenId?: string;
      scopes?: string[];
    };

/**
 * Authorize any subject (human user or agent token) against a project.
 * Users are checked via membership. A user-scoped agent token is checked via
 * the owner's membership (grants access to all of the owner's projects); a
 * legacy token is limited to the single project it was minted for.
 */
export async function assertProjectAccess(
  prisma: PrismaService,
  actor: RequestActor | undefined,
  projectId: string,
): Promise<void> {
  if (actor?.type === 'agent') {
    if (actor.userId) {
      await assertMembership(prisma, actor.userId, projectId);
      return;
    }
    if (actor.projectId) {
      if (actor.projectId !== projectId) {
        throw new ForbiddenException('Token is not scoped to this project');
      }
      return;
    }
    throw new ForbiddenException('Token has no scope');
  }
  if (!actor?.sub) throw new ForbiddenException('Not authenticated');
  await assertMembership(prisma, actor.sub, projectId);
}

/** Authorize the actor against the project that owns a board. */
export async function assertBoardAccess(
  prisma: PrismaService,
  actor: RequestActor | undefined,
  boardId: string,
): Promise<void> {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) throw new NotFoundException(`Board ${boardId} not found`);
  await assertProjectAccess(prisma, actor, board.projectId);
}

/** Authorize the actor against the project that owns a card (via its board). */
export async function assertCardAccess(
  prisma: PrismaService,
  actor: RequestActor | undefined,
  cardId: string,
): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { board: true },
  });
  if (!card) throw new NotFoundException(`Card ${cardId} not found`);
  await assertProjectAccess(prisma, actor, card.board.projectId);
}
