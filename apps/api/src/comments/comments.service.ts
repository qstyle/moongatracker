import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { CommentDto } from '@moongatracker/shared-types';
import { toCommentDto } from './comment.mapper';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(cardId: string): Promise<CommentDto[]> {
    const rows = await this.prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCommentDto);
  }

  async create(cardId: string, body: string): Promise<CommentDto> {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException(`Card ${cardId} not found`);
    const created = await this.prisma.comment.create({
      data: { cardId, body, authorType: 'human' },
    });
    return toCommentDto(created);
  }
}
