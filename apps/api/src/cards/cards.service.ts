import { Injectable, NotFoundException } from '@nestjs/common';
import {
  assertBoardAccess,
  assertCardAccess,
  PrismaService,
  RequestActor,
} from '@moongatracker/data-access';
import { CardDto } from '@moongatracker/shared-types';
import { ActivityService } from '../activity/activity.service';
import { toCardDto } from './card.mapper';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

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

    let existing: Awaited<ReturnType<typeof this.prisma.card.findUnique>> =
      null;
    if (user?.type === 'agent') {
      existing = await this.prisma.card.findUnique({ where: { id } });
    }

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

    return toCardDto(card);
  }

  async remove(id: string, actor: RequestActor): Promise<void> {
    await assertCardAccess(this.prisma, actor, id);
    await this.prisma.card.delete({ where: { id } });
  }
}
