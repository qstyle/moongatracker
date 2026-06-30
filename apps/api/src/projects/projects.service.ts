import { Injectable, NotFoundException } from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import {
  ActorDto,
  CardDto,
  CardPriority,
  ColumnDto,
  ProjectDto,
  ProjectSummaryDto,
} from '@moongatracker/shared-types';

const priorityWeight = { urgent: 3, normal: 2, low: 1 } as Record<
  string,
  number
>;

function toCardDto(card: {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  body: string | null;
  priority: string | null;
  authorType: string;
  authorId: string | null;
  assigneeType: string | null;
  assigneeId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { attachments: number };
}): CardDto {
  return {
    id: card.id,
    projectId: card.projectId,
    columnId: card.columnId,
    title: card.title,
    body: card.body,
    priority: card.priority as CardPriority | null,
    author: {
      type: card.authorType as 'user' | 'agent',
      id: card.authorId ?? null,
      name: null,
    },
    assignee: card.assigneeType
      ? ({
          type: card.assigneeType as 'user' | 'agent',
          id: card.assigneeId ?? null,
          name: null,
        } as ActorDto)
      : null,
    order: card.order,
    attachmentCount: card._count?.attachments ?? 0,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForOrg(
    orgId: string,
    userId: string,
  ): Promise<ProjectSummaryDto[]> {
    await assertMembership(this.prisma, userId, orgId);
    const projects = await this.prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });
    return projects.map((p) => ({
      id: p.id,
      orgId: p.orgId,
      name: p.name,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async create(
    orgId: string,
    name: string,
    userId: string,
  ): Promise<ProjectSummaryDto> {
    await assertMembership(this.prisma, userId, orgId);
    const project = await this.prisma.project.create({
      data: { orgId, name },
    });
    return {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    };
  }

  async getWithColumns(projectId: string, userId: string): Promise<ProjectDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            cards: {
              include: {
                _count: { select: { attachments: true } },
              },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    await assertMembership(this.prisma, userId, project.orgId);

    const columns: ColumnDto[] = project.columns.map((col) => {
      const cards = [...col.cards];
      cards.sort((a, b) => {
        const wa = priorityWeight[a.priority ?? ''] ?? 0;
        const wb = priorityWeight[b.priority ?? ''] ?? 0;
        if (wb !== wa) return wb - wa;
        return a.order - b.order;
      });
      return {
        id: col.id,
        projectId: col.projectId,
        title: col.title,
        order: col.order,
        cards: cards.map(toCardDto),
      };
    });

    return {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      columns,
    };
  }

  async update(
    projectId: string,
    userId: string,
    name: string,
  ): Promise<ProjectSummaryDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    await assertMembership(this.prisma, userId, project.orgId);
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { name },
    });
    return {
      id: updated.id,
      orgId: updated.orgId,
      name: updated.name,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async getActors(projectId: string, userId: string): Promise<ActorDto[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    await assertMembership(this.prisma, userId, project.orgId);

    const [memberships, apiTokens] = await Promise.all([
      this.prisma.membership.findMany({
        where: { orgId: project.orgId },
        include: { user: true },
      }),
      this.prisma.apiToken.findMany({
        where: { orgId: project.orgId, revokedAt: null },
      }),
    ]);

    const userActors: ActorDto[] = memberships.map((m) => ({
      type: 'user' as const,
      id: m.user.id,
      name: m.user.name ?? null,
    }));

    const agentActors: ActorDto[] = apiTokens.map((t) => ({
      type: 'agent' as const,
      id: t.id,
      name: t.name,
    }));

    return [...userActors, ...agentActors];
  }
}
