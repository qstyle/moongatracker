import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertMembership,
  PrismaService,
  RequestActor,
} from '@moongatracker/data-access';
import {
  isValidHexColor,
  MEMBER_COLOR_PALETTE,
  MemberDto,
  pickNextMemberColor,
  ProjectDto,
} from '@moongatracker/shared-types';
import { buildOnboardingCards } from '../boards/onboarding';
import { buildStarterWiki } from '../wiki/starter-wiki';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Projects visible to the caller: an agent token sees only its own
   * project; a human user sees the projects they are a member of. */
  async listForActor(actor: RequestActor): Promise<ProjectDto[]> {
    if (actor?.type === 'agent') {
      const project = await this.prisma.project.findUnique({
        where: { id: actor.projectId },
      });
      return project
        ? [
            {
              id: project.id,
              name: project.name,
              ownerId: project.ownerId,
              createdAt: project.createdAt.toISOString(),
            },
          ]
        : [];
    }
    return this.listForUser(actor.sub);
  }

  async listForUser(userId: string): Promise<ProjectDto[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { project: true },
    });
    return memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      ownerId: m.project.ownerId,
      createdAt: m.project.createdAt.toISOString(),
    }));
  }

  async create(name: string, userId: string): Promise<ProjectDto> {
    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: { name, ownerId: userId },
      });
      await tx.membership.create({
        data: { projectId: created.id, userId, color: MEMBER_COLOR_PALETTE[0] },
      });
      const board = await tx.board.create({
        data: { projectId: created.id, name, seq: 1 },
      });
      const column = await tx.column.create({
        data: { boardId: board.id, title: 'С чего начать', order: 0 },
      });
      await tx.card.createMany({
        data: buildOnboardingCards(board.id, column.id, userId),
      });
      await buildStarterWiki(tx, created.id);
      return created;
    });
    return {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
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
      ownerId: project.ownerId,
      createdAt: project.createdAt.toISOString(),
    };
  }

  async getMembers(projectId: string, userId: string): Promise<MemberDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const memberships = await this.prisma.membership.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name ?? null,
      color: m.color,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async addMember(
    projectId: string,
    email: string,
    callerUserId: string,
  ): Promise<MemberDto> {
    await assertMembership(this.prisma, callerUserId, projectId);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);

    const existing = await this.prisma.membership.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    if (existing) throw new ConflictException('User is already a member');

    const existingColors = await this.prisma.membership.findMany({
      where: { projectId },
      select: { color: true },
    });
    const color = pickNextMemberColor(existingColors.map((m) => m.color));

    const membership = await this.prisma.membership.create({
      data: { projectId, userId: user.id, color },
      include: { user: true },
    });

    return {
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name ?? null,
      color: membership.color,
      createdAt: membership.createdAt.toISOString(),
    };
  }

  async updateMemberColor(
    projectId: string,
    targetUserId: string,
    color: string,
    callerUserId: string,
  ): Promise<MemberDto> {
    await assertMembership(this.prisma, callerUserId, projectId);

    if (!isValidHexColor(color)) {
      throw new BadRequestException('Color must be a #RRGGBB hex value');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== callerUserId) {
      throw new ForbiddenException('Only the project owner can change colors');
    }

    const updated = await this.prisma.membership.updateMany({
      where: { projectId, userId: targetUserId },
      data: { color },
    });
    if (updated.count === 0) throw new NotFoundException('Member not found');

    const membership = await this.prisma.membership.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      include: { user: true },
    });
    return {
      userId: membership!.userId,
      email: membership!.user.email,
      name: membership!.user.name ?? null,
      color: membership!.color,
      createdAt: membership!.createdAt.toISOString(),
    };
  }

  async delete(projectId: string, userId: string): Promise<void> {
    await assertMembership(this.prisma, userId, projectId);
    await this.prisma.$transaction(async (tx) => {
      const boards = await tx.board.findMany({
        where: { projectId },
        select: { id: true },
      });
      const boardIds = boards.map((b) => b.id);
      if (boardIds.length > 0) {
        await tx.card.deleteMany({ where: { boardId: { in: boardIds } } });
      }
      await tx.project.delete({ where: { id: projectId } });
    });
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
