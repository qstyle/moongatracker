import { Injectable } from '@nestjs/common';
import {
  assertCardAccess,
  PrismaService,
  RequestActor,
} from '@moongatracker/data-access';
import { CommentDto } from '@moongatracker/shared-types';
import { ActivityService } from '../activity/activity.service';
import { toCommentDto } from './comment.mapper';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(cardId: string, actor: RequestActor): Promise<CommentDto[]> {
    await assertCardAccess(this.prisma, actor, cardId);
    const rows = await this.prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCommentDto);
  }

  async create(cardId: string, body: string, user?: any): Promise<CommentDto> {
    await assertCardAccess(this.prisma, user, cardId);

    const authorType = user?.type === 'agent' ? 'agent' : 'user';
    const authorId =
      user?.type === 'agent' ? (user.tokenId ?? null) : (user?.sub ?? null);

    const created = await this.prisma.comment.create({
      data: { cardId, body, authorType, authorId },
    });

    if (user?.type === 'agent') {
      await this.activity.record(
        cardId,
        'agent',
        user.tokenId ?? '',
        'comment',
        null,
        { body },
      );
    }

    return toCommentDto(created);
  }
}
