import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import { ColumnDto } from '@moongatracker/shared-types';

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    boardId: string,
    title: string,
    userId: string,
  ): Promise<ColumnDto> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);
    await assertMembership(this.prisma, userId, board.projectId);

    const max = await this.prisma.column.aggregate({
      where: { boardId },
      _max: { order: true },
    });
    const order = (max._max.order ?? -1) + 1;

    const column = await this.prisma.column.create({
      data: { boardId, title, order },
    });

    return {
      id: column.id,
      boardId: column.boardId,
      title: column.title,
      order: column.order,
      cards: [],
    };
  }

  async update(
    columnId: string,
    userId: string,
    input: { title?: string; order?: number },
  ): Promise<ColumnDto> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!column) throw new NotFoundException(`Column ${columnId} not found`);
    await assertMembership(this.prisma, userId, column.board.projectId);

    const updated = await this.prisma.column.update({
      where: { id: columnId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.order !== undefined && { order: input.order }),
      },
    });

    return {
      id: updated.id,
      boardId: updated.boardId,
      title: updated.title,
      order: updated.order,
      cards: [],
    };
  }

  async reorder(
    boardId: string,
    orderedIds: string[],
    userId: string,
  ): Promise<void> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);
    await assertMembership(this.prisma, userId, board.projectId);

    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.column.updateMany({
          where: { id, boardId },
          data: { order: index },
        }),
      ),
    );
  }

  async remove(columnId: string, userId: string): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!column) throw new NotFoundException(`Column ${columnId} not found`);
    await assertMembership(this.prisma, userId, column.board.projectId);

    const cardCount = await this.prisma.card.count({
      where: { columnId },
    });
    if (cardCount > 0) throw new ConflictException('Column has cards');

    await this.prisma.column.delete({ where: { id: columnId } });
  }
}
