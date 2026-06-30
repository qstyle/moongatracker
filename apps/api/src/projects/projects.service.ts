import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import { MemberDto, ProjectDto } from '@moongatracker/shared-types';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<ProjectDto[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { project: true },
    });
    return memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      createdAt: m.project.createdAt.toISOString(),
    }));
  }

  async create(name: string, userId: string): Promise<ProjectDto> {
    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({ data: { name } });
      await tx.membership.create({ data: { projectId: created.id, userId } });
      return created;
    });
    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    };
  }

  async update(
    projectId: string,
    userId: string,
    name: string,
  ): Promise<ProjectDto> {
    await assertMembership(this.prisma, userId, projectId);
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { name },
    });
    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    };
  }

  async getMembers(projectId: string, userId: string): Promise<MemberDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const memberships = await this.prisma.membership.findMany({
      where: { projectId },
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
    projectId: string,
    email: string,
    callerUserId: string,
  ): Promise<MemberDto> {
    await assertMembership(this.prisma, callerUserId, projectId);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);

    const existing = await this.prisma.membership.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    if (existing) throw new ConflictException('User is already a member');

    const membership = await this.prisma.membership.create({
      data: { projectId, userId: user.id },
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
    projectId: string,
    targetUserId: string,
    callerUserId: string,
  ): Promise<void> {
    await assertMembership(this.prisma, callerUserId, projectId);

    if (targetUserId === callerUserId) {
      throw new BadRequestException('Cannot remove yourself from the project');
    }

    const deleted = await this.prisma.membership.deleteMany({
      where: { projectId, userId: targetUserId },
    });

    if (deleted.count === 0) throw new NotFoundException('Member not found');
  }
}
