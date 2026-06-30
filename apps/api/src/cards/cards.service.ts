import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { CardDto } from '@moongatracker/shared-types';
import { toCardDto } from './card.mapper';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCardDto, user?: any): Promise<CardDto> {
    const max = await this.prisma.card.aggregate({
      where: { projectId: dto.projectId, columnId: dto.columnId },
      _max: { order: true },
    });
    const order = (max._max.order ?? -1) + 1;

    const authorType = user?.type === 'agent' ? 'agent' : 'user';
    const authorId =
      user?.type === 'agent' ? (user.tokenId ?? null) : (user?.sub ?? null);

    const card = await this.prisma.card.create({
      data: {
        projectId: dto.projectId,
        columnId: dto.columnId,
        title: dto.title,
        body: dto.body ?? null,
        order,
        authorType,
        authorId,
      },
    });
    return toCardDto(card);
  }

  async getById(id: string): Promise<CardDto> {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    return toCardDto(card);
  }

  async update(id: string, dto: UpdateCardDto, user?: any): Promise<CardDto> {
    await this.ensureExists(id);
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
