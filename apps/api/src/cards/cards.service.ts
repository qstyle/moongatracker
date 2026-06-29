import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { CardDto } from '@moongatracker/shared-types';
import { toCardDto } from './card.mapper';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCardDto): Promise<CardDto> {
    const max = await this.prisma.card.aggregate({
      where: { boardId: input.boardId, columnKey: input.columnKey },
      _max: { order: true },
    });
    const order = (max._max.order ?? -1) + 1;

    const card = await this.prisma.card.create({
      data: {
        boardId: input.boardId,
        columnKey: input.columnKey,
        title: input.title,
        body: input.body ?? null,
        order,
      },
    });
    return toCardDto(card);
  }

  async update(id: string, input: UpdateCardDto): Promise<CardDto> {
    await this.ensureExists(id);
    const card = await this.prisma.card.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.body !== undefined && { body: input.body }),
        ...(input.columnKey !== undefined && { columnKey: input.columnKey }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.priority !== undefined && { priority: input.priority }),
      },
    });
    return toCardDto(card);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.card.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.card.findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`Card ${id} not found`);
  }
}
