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
