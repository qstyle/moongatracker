import { ForbiddenException } from '@nestjs/common';
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
  | { type: 'agent'; projectId: string; tokenId?: string; scopes?: string[] };

/**
 * Authorize any subject (human user or agent token) against a project.
 * Users are checked via membership; agent tokens are scoped to a single
 * project at mint time, so we only verify the token targets that project.
 */
export async function assertProjectAccess(
  prisma: PrismaService,
  actor: RequestActor | undefined,
  projectId: string,
): Promise<void> {
  if (actor?.type === 'agent') {
    if (actor.projectId !== projectId) {
      throw new ForbiddenException('Token is not scoped to this project');
    }
    return;
  }
  if (!actor?.sub) throw new ForbiddenException('Not authenticated');
  await assertMembership(prisma, actor.sub, projectId);
}
