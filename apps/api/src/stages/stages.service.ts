import { Injectable, NotFoundException } from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import { StageDto } from '@moongatracker/shared-types';
import { buildDefaultStages } from './default-stages';
import { toStageDto } from './stage.mapper';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(projectId: string, userId: string): Promise<StageDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const stages = await this.prisma.stage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        boards: {
          orderBy: { createdAt: 'asc' },
          include: { _count: { select: { cards: true } } },
        },
      },
    });
    return stages.map(toStageDto);
  }

  async create(
    projectId: string,
    title: string,
    userId: string,
  ): Promise<StageDto> {
    await assertMembership(this.prisma, userId, projectId);
    const max = await this.prisma.stage.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    const stage = await this.prisma.stage.create({
      data: { projectId, title, order: (max._max.order ?? -1) + 1 },
      include: { boards: true },
    });
    return toStageDto(stage);
  }

  /** Seed the 6 default stages if the project has none yet (idempotent). */
  async seedDefaults(projectId: string, userId: string): Promise<StageDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const count = await this.prisma.stage.count({ where: { projectId } });
    if (count === 0) {
      await this.prisma.stage.createMany({ data: buildDefaultStages(projectId) });
    }
    return this.listForProject(projectId, userId);
  }

  async reorder(
    projectId: string,
    orderedIds: string[],
    userId: string,
  ): Promise<void> {
    await assertMembership(this.prisma, userId, projectId);
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.stage.updateMany({
          where: { id, projectId },
          data: { order: index },
        }),
      ),
    );
  }

  async update(
    stageId: string,
    userId: string,
    input: { title?: string; status?: string },
  ): Promise<StageDto> {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    await assertMembership(this.prisma, userId, stage.projectId);
    const updated = await this.prisma.stage.update({
      where: { id: stageId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: {
        boards: {
          orderBy: { createdAt: 'asc' },
          include: { _count: { select: { cards: true } } },
        },
      },
    });
    return toStageDto(updated);
  }

  async remove(stageId: string, userId: string): Promise<void> {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    await assertMembership(this.prisma, userId, stage.projectId);
    // Boards belonging to this stage detach automatically (FK onDelete: SetNull).
    await this.prisma.stage.delete({ where: { id: stageId } });
  }
}
