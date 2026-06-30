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
    projectId: string,
    title: string,
    userId: string,
  ): Promise<ColumnDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    await assertMembership(this.prisma, userId, project.orgId);

    const max = await this.prisma.column.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    const order = (max._max.order ?? -1) + 1;

    const column = await this.prisma.column.create({
      data: { projectId, title, order },
    });

    return {
      id: column.id,
      projectId: column.projectId,
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
      include: { project: true },
    });
    if (!column) throw new NotFoundException(`Column ${columnId} not found`);
    await assertMembership(this.prisma, userId, column.project.orgId);

    const updated = await this.prisma.column.update({
      where: { id: columnId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.order !== undefined && { order: input.order }),
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      order: updated.order,
      cards: [],
    };
  }

  async reorder(
    projectId: string,
    orderedIds: string[],
    userId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    await assertMembership(this.prisma, userId, project.orgId);

    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.column.updateMany({
          where: { id, projectId },
          data: { order: index },
        }),
      ),
    );
  }

  async remove(columnId: string, userId: string): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { project: true },
    });
    if (!column) throw new NotFoundException(`Column ${columnId} not found`);
    await assertMembership(this.prisma, userId, column.project.orgId);

    const cardCount = await this.prisma.card.count({
      where: { columnId },
    });
    if (cardCount > 0) throw new ConflictException('Column has cards');

    await this.prisma.column.delete({ where: { id: columnId } });
  }
}
