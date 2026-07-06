import { Injectable, NotFoundException } from '@nestjs/common';
import { assertMembership, PrismaService } from '@moonga-studio/data-access';
import { StageDto } from '@moonga-studio/shared-types';
import { buildDefaultStages } from './default-stages';
import { toStageDto } from './stage.mapper';
import {
  STAGE_TEMPLATES,
  StageKey,
  StageTemplate,
  renderToolsLinksPage,
} from './stage-templates';
import { buildDefaultColumns } from '../columns/default-columns';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(projectId: string, userId: string): Promise<StageDto[]> {
    await assertMembership(this.prisma, userId, projectId);
    const stages = await this.prisma.stage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: { boards: { orderBy: { createdAt: 'asc' } } },
    });

    // Tally cards per board by column category, then roll up to each stage.
    const boardIds = stages.flatMap((s) => s.boards.map((b) => b.id));
    const columns = boardIds.length
      ? await this.prisma.column.findMany({
          where: { boardId: { in: boardIds } },
          select: {
            boardId: true,
            category: true,
            _count: { select: { cards: true } },
          },
        })
      : [];
    const perBoard = new Map<
      string,
      { open: number; inProgress: number; done: number }
    >();
    for (const c of columns) {
      const t = perBoard.get(c.boardId) ?? { open: 0, inProgress: 0, done: 0 };
      const n = c._count.cards;
      if (c.category === 'open') t.open += n;
      else if (c.category === 'in_progress') t.inProgress += n;
      else if (c.category === 'done') t.done += n;
      perBoard.set(c.boardId, t);
    }

    return stages.map((s) => {
      const counts = s.boards.reduce(
        (acc, b) => {
          const t = perBoard.get(b.id);
          if (t) {
            acc.open += t.open;
            acc.inProgress += t.inProgress;
            acc.done += t.done;
          }
          return acc;
        },
        { open: 0, inProgress: 0, done: 0 },
      );
      return toStageDto(s, counts);
    });
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

  /** Seed the 5 default stages if the project has none yet (idempotent). */
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
      include: { boards: { orderBy: { createdAt: 'asc' } } },
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

  /**
   * Scaffold a stage: create a board (+ default columns) for the stage.
   * If the stage has a recognised template key, also seed backlog cards into
   * the first column and create a WikiSection with template pages plus an
   * "Инструменты и ссылки" page.
   *
   * Idempotent: if the stage already has a board, returns its id immediately.
   * Custom (non-template) stages get board + columns only — no cards / wiki.
   */
  async scaffold(
    projectId: string,
    stageId: string,
    userId: string,
  ): Promise<{ boardId: string }> {
    await assertMembership(this.prisma, userId, projectId);

    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage || stage.projectId !== projectId) {
      throw new NotFoundException('Stage not found in project');
    }

    // Idempotency guard: if a board already belongs to this stage, return it.
    const existing = await this.prisma.board.findFirst({ where: { stageId } });
    if (existing) return { boardId: existing.id };

    // Resolve template (null for custom stages).
    const tpl: StageTemplate | null =
      stage.key &&
      (STAGE_TEMPLATES as Record<string, StageTemplate>)[stage.key]
        ? STAGE_TEMPLATES[stage.key as StageKey]
        : null;

    return this.prisma.$transaction(async (tx) => {
      // Compute next board seq for this project.
      const seqAgg = await tx.board.aggregate({
        where: { projectId },
        _max: { seq: true },
      });
      const board = await tx.board.create({
        data: {
          projectId,
          name: stage.title,
          seq: (seqAgg._max.seq ?? 0) + 1,
          stageId,
        },
      });

      // Seed the 4 default columns.
      await tx.column.createMany({ data: buildDefaultColumns(board.id) });

      if (tpl) {
        // Find the first column (order = 0, "Открыто") for backlog cards.
        const openCol = await tx.column.findFirst({
          where: { boardId: board.id, order: 0 },
        });

        if (openCol && tpl.backlogCards.length > 0) {
          await tx.card.createMany({
            data: tpl.backlogCards.map((c, i) => ({
              boardId: board.id,
              columnId: openCol.id,
              // number is per-board sequential; fresh board so 1-based index.
              number: i + 1,
              title: c.title,
              body: c.body ?? '',
              order: i,
              // Scaffold runs as an automated agent action (no real user card author).
              authorType: 'agent',
              authorId: null,
            })),
          });
        }

        // Create the wiki section tied to this stage.
        const secAgg = await tx.wikiSection.aggregate({
          where: { projectId },
          _max: { order: true },
        });
        const section = await tx.wikiSection.create({
          data: {
            projectId,
            stageId,
            title: stage.title,
            order: (secAgg._max.order ?? -1) + 1,
          },
        });

        // Template wiki pages + the auto-generated tools/links page.
        const pages = [
          ...tpl.wikiPages,
          { title: 'Инструменты и ссылки', body: renderToolsLinksPage(tpl) },
        ];
        await tx.wikiPage.createMany({
          data: pages.map((p, i) => ({
            sectionId: section.id,
            title: p.title,
            body: p.body,
            order: i,
            // Created by the system scaffold; no human author.
            authorType: 'agent',
            authorId: null,
          })),
        });
      }

      return { boardId: board.id };
    });
  }
}
