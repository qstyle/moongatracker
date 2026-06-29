import { Injectable } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { BoardDto, ColumnKey } from '@moongatracker/shared-types';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async listBoards(): Promise<BoardDto[]> {
    const boards = await this.prisma.board.findMany({
      include: {
        columns: { orderBy: { order: 'asc' } },
        cards: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return boards.map((b) => ({
      id: b.id,
      name: b.name,
      createdAt: b.createdAt.toISOString(),
      columns: b.columns.map((c) => ({
        id: c.id,
        key: c.key as ColumnKey,
        title: c.title,
        order: c.order,
        cards: b.cards
          .filter((card) => card.columnKey === c.key)
          .map((card) => ({
            id: card.id,
            title: card.title,
            body: card.body,
            priority: card.priority,
            order: card.order,
          })),
      })),
    }));
  }
}
