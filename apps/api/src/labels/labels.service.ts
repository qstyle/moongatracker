import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { LabelDto } from '@moongatracker/shared-types';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForBoard(boardId: string): Promise<LabelDto[]> {
    const rows = await this.prisma.label.findMany({
      where: { boardId },
      orderBy: { name: 'asc' },
    });
    return rows.map((l) => ({ id: l.id, name: l.name, color: l.color }));
  }

  async create(
    boardId: string,
    name: string,
    color: string,
  ): Promise<LabelDto> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);
    const label = await this.prisma.label.create({
      data: { boardId, name, color },
    });
    return { id: label.id, name: label.name, color: label.color };
  }

  async attach(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.upsert({
      where: { cardId_labelId: { cardId, labelId } },
      create: { cardId, labelId },
      update: {},
    });
  }

  async detach(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.deleteMany({ where: { cardId, labelId } });
  }
}
