import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  assertBoardAccess,
  assertCardAccess,
  PrismaService,
  RequestActor,
} from '@moonga-studio/data-access';
import { CardDto } from '@moonga-studio/shared-types';
import { ActivityService } from '../activity/activity.service';
import {
  CARD_ASSIGNED,
  CARD_MOVED,
  EventActor,
} from '../telegram/telegram.events';
import { toCardDto } from './card.mapper';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly events: EventEmitter2,
  ) {}

  private actorOf(user?: any): EventActor {
    return user?.type === 'agent'
      ? { type: 'agent', id: user.tokenId ?? null }
      : { type: 'user', id: user?.sub ?? null };
  }

  /** Project ids the actor can access (member of, or legacy token scope). */
  private async accessibleProjectIds(
    actor: RequestActor | undefined,
  ): Promise<string[]> {
    if (actor?.type === 'agent') {
      if (actor.userId) {
        const ms = await this.prisma.membership.findMany({
          where: { userId: actor.userId },
          select: { projectId: true },
        });
        return ms.map((m) => m.projectId);
      }
      return actor.projectId ? [actor.projectId] : [];
    }
    if (!actor?.sub) return [];
    const ms = await this.prisma.membership.findMany({
      where: { userId: actor.sub },
      select: { projectId: true },
    });
    return ms.map((m) => m.projectId);
  }

  /** Cards assigned to the caller across every project they can access. */
  async listAssignedTo(actor: RequestActor): Promise<CardDto[]> {
    const { type, id } = this.actorOf(actor);
    if (!id) return [];
    const projectIds = await this.accessibleProjectIds(actor);
    if (!projectIds.length) return [];
    const cards = await this.prisma.card.findMany({
      where: {
        assigneeType: type,
        assigneeId: id,
        board: { projectId: { in: projectIds } },
      },
      include: { _count: { select: { attachments: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return cards.map(toCardDto);
  }

  async create(dto: CreateCardDto, user?: any): Promise<CardDto> {
    await assertBoardAccess(this.prisma, user, dto.boardId);
    const authorType = user?.type === 'agent' ? 'agent' : 'user';
    const authorId =
      user?.type === 'agent' ? (user.tokenId ?? null) : (user?.sub ?? null);

    // Assign order (per column) and number (per board) atomically; the
    // @@unique([boardId, number]) index guards against any residual race.
    const card = await this.prisma.$transaction(async (tx) => {
      const [orderAgg, numberAgg] = await Promise.all([
        tx.card.aggregate({
          where: { boardId: dto.boardId, columnId: dto.columnId },
          _max: { order: true },
        }),
        tx.card.aggregate({
          where: { boardId: dto.boardId },
          _max: { number: true },
        }),
      ]);
      return tx.card.create({
        data: {
          boardId: dto.boardId,
          columnId: dto.columnId,
          number: (numberAgg._max.number ?? 0) + 1,
          title: dto.title,
          body: dto.body ?? null,
          priority: dto.priority ?? null,
          order: (orderAgg._max.order ?? -1) + 1,
          authorType,
          authorId,
        },
      });
    });

    if (user?.type === 'agent') {
      await this.activity.record(
        card.id,
        'agent',
        user.tokenId ?? user.sub ?? '',
        'create',
        null,
        { title: card.title, columnId: card.columnId },
      );
    }

    return toCardDto(card);
  }

  async getByBoardAndNumber(
    boardId: string,
    number: number,
    actor: RequestActor,
  ): Promise<CardDto> {
    await assertBoardAccess(this.prisma, actor, boardId);
    const card = await this.prisma.card.findUnique({
      where: { boardId_number: { boardId, number } },
      include: {
        _count: { select: { attachments: true } },
      },
    });
    if (!card)
      throw new NotFoundException(`Card #${number} not found in board ${boardId}`);
    return toCardDto(card);
  }

  async getById(id: string, actor: RequestActor): Promise<CardDto> {
    await assertCardAccess(this.prisma, actor, id);
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: {
        _count: { select: { attachments: true } },
      },
    });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    return toCardDto(card);
  }

  async update(id: string, dto: UpdateCardDto, user?: any): Promise<CardDto> {
    await assertCardAccess(this.prisma, user, id);

    // Sentinel: assigneeId "me" self-assigns to the caller (agent or user) so an
    // agent can claim a card without knowing its own token id.
    if (dto.assigneeId === 'me') {
      const self = this.actorOf(user);
      dto.assigneeId = self.id;
      dto.assigneeType = self.type;
    }

    // Always load the prior state: needed both for the agent activity trace and
    // to diff column/assignee changes for Telegram notifications.
    const existing = await this.prisma.card.findUnique({ where: { id } });

    const card = await this.prisma.card.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.columnId !== undefined && { columnId: dto.columnId }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.assigneeType !== undefined && {
          assigneeType: dto.assigneeType,
        }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
      },
    });

    if (user?.type === 'agent') {
      await this.activity.record(
        id,
        'agent',
        user.tokenId ?? '',
        'update',
        {
          title: existing?.title,
          body: existing?.body,
          priority: existing?.priority,
          columnId: existing?.columnId,
        },
        { ...dto },
      );
    }

    const actor = this.actorOf(user);
    if (
      dto.columnId !== undefined &&
      existing &&
      existing.columnId !== card.columnId
    ) {
      this.events.emit(CARD_MOVED, {
        cardId: id,
        actor,
        fromColumnId: existing.columnId,
        toColumnId: card.columnId,
      });
    }
    if (
      dto.assigneeId !== undefined &&
      card.assigneeId &&
      existing?.assigneeId !== card.assigneeId
    ) {
      this.events.emit(CARD_ASSIGNED, {
        cardId: id,
        actor,
        assignee: {
          type: (card.assigneeType as 'user' | 'agent') ?? 'user',
          id: card.assigneeId,
        },
      });
    }

    return toCardDto(card);
  }

  async remove(id: string, actor: RequestActor): Promise<void> {
    await assertCardAccess(this.prisma, actor, id);
    await this.prisma.card.delete({ where: { id } });
  }
}
