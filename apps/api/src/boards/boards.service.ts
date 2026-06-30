import { Injectable, NotFoundException } from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import { buildOnboardingCards } from './onboarding';
import {
  ActorDto,
  BoardDto,
  BoardSummaryDto,
  CardDto,
  CardPriority,
  ColumnDto,
} from '@moongatracker/shared-types';

const priorityWeight = { urgent: 3, normal: 2, low: 1 } as Record<
  string,
  number
>;

/** Fixed display color for agent actors (matches the amber agent marker in the UI). */
const AGENT_COLOR = '#f59e0b';

function toCardDto(card: {
  id: string;
  boardId: string;
  columnId: string;
  number: number;
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
    boardId: card.boardId,
    columnId: card.columnId,
    number: card.number,
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
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(
    projectId: string,
    userId: string,
  ): Promise<BoardSummaryDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const boards = await this.prisma.board.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return boards.map((b) => ({
      id: b.id,
      projectId: b.projectId,
      name: b.name,
      seq: b.seq,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  async create(
    projectId: string,
    name: string,
    userId: string,
  ): Promise<BoardSummaryDto> {
    await assertMembership(this.prisma, userId, projectId);
    const board = await this.prisma.$transaction(async (tx) => {
      const seqAgg = await tx.board.aggregate({
        where: { projectId },
        _max: { seq: true },
      });
      const created = await tx.board.create({
        data: { projectId, name, seq: (seqAgg._max.seq ?? 0) + 1 },
      });
      const column = await tx.column.create({
        data: { boardId: created.id, title: 'С чего начать', order: 0 },
      });
      await tx.card.createMany({
        data: buildOnboardingCards(created.id, column.id, userId),
      });
      return created;
    });
    return {
      id: board.id,
      projectId: board.projectId,
      name: board.name,
      seq: board.seq,
      createdAt: board.createdAt.toISOString(),
    };
  }

  async getWithColumns(boardId: string, userId: string): Promise<BoardDto> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
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
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);
    await assertMembership(this.prisma, userId, board.projectId);

    const columns: ColumnDto[] = board.columns.map((col) => {
      const cards = [...col.cards];
      cards.sort((a, b) => {
        const wa = priorityWeight[a.priority ?? ''] ?? 0;
        const wb = priorityWeight[b.priority ?? ''] ?? 0;
        if (wb !== wa) return wb - wa;
        return a.order - b.order;
      });
      return {
        id: col.id,
        boardId: col.boardId,
        title: col.title,
        order: col.order,
        cards: cards.map(toCardDto),
      };
    });

    return {
      id: board.id,
      projectId: board.projectId,
      name: board.name,
      seq: board.seq,
      createdAt: board.createdAt.toISOString(),
      columns,
    };
  }

  async update(
    boardId: string,
    userId: string,
    name: string,
  ): Promise<BoardSummaryDto> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);
    await assertMembership(this.prisma, userId, board.projectId);
    const updated = await this.prisma.board.update({
      where: { id: boardId },
      data: { name },
    });
    return {
      id: updated.id,
      projectId: updated.projectId,
      name: updated.name,
      seq: updated.seq,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async delete(boardId: string, userId: string): Promise<void> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);
    await assertMembership(this.prisma, userId, board.projectId);
    await this.prisma.$transaction(async (tx) => {
      await tx.card.deleteMany({ where: { boardId } });
      await tx.board.delete({ where: { id: boardId } });
    });
  }

  async getActors(boardId: string, userId: string): Promise<ActorDto[]> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);
    await assertMembership(this.prisma, userId, board.projectId);

    const [memberships, apiTokens] = await Promise.all([
      this.prisma.membership.findMany({
        where: { projectId: board.projectId },
        include: { user: true },
      }),
      this.prisma.apiToken.findMany({
        where: { projectId: board.projectId, revokedAt: null },
      }),
    ]);

    const userActors: ActorDto[] = memberships.map((m) => ({
      type: 'user' as const,
      id: m.user.id,
      name: m.user.name ?? null,
      color: m.color ?? null,
    }));

    const agentActors: ActorDto[] = apiTokens.map((t) => ({
      type: 'agent' as const,
      id: t.id,
      name: t.name,
      color: AGENT_COLOR,
    }));

    return [...userActors, ...agentActors];
  }
}
