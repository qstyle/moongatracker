import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import { MemberDto, OrgDto } from '@moongatracker/shared-types';

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<OrgDto[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { org: true },
    });
    return memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      createdAt: m.org.createdAt.toISOString(),
    }));
  }

  async create(name: string, userId: string): Promise<OrgDto> {
    const org = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({ data: { name } });
      await tx.membership.create({ data: { orgId: created.id, userId } });
      return created;
    });
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt.toISOString(),
    };
  }

  async update(orgId: string, userId: string, name: string): Promise<OrgDto> {
    await assertMembership(this.prisma, userId, orgId);
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { name },
    });
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt.toISOString(),
    };
  }

  async getMembers(orgId: string, userId: string): Promise<MemberDto[]> {
    await assertMembership(this.prisma, userId, orgId);
    const memberships = await this.prisma.membership.findMany({
      where: { orgId },
      include: { user: true },
    });
    return memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async addMember(
    orgId: string,
    email: string,
    callerUserId: string,
  ): Promise<MemberDto> {
    await assertMembership(this.prisma, callerUserId, orgId);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);

    const existing = await this.prisma.membership.findUnique({
      where: { orgId_userId: { orgId, userId: user.id } },
    });
    if (existing) throw new ConflictException('User is already a member');

    const membership = await this.prisma.membership.create({
      data: { orgId, userId: user.id },
      include: { user: true },
    });

    return {
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name ?? null,
      createdAt: membership.createdAt.toISOString(),
    };
  }

  async removeMember(
    orgId: string,
    targetUserId: string,
    callerUserId: string,
  ): Promise<void> {
    await assertMembership(this.prisma, callerUserId, orgId);

    if (targetUserId === callerUserId) {
      throw new BadRequestException(
        'Cannot remove yourself from the organization',
      );
    }

    const deleted = await this.prisma.membership.deleteMany({
      where: { orgId, userId: targetUserId },
    });

    if (deleted.count === 0) throw new NotFoundException('Member not found');
  }
}
