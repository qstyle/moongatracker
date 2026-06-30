import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

export async function assertMembership(
  prisma: PrismaService,
  userId: string,
  orgId: string,
): Promise<void> {
  const m = await prisma.membership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!m) throw new ForbiddenException('Not a member of this organization');
}
