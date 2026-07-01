import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import {
  CanvasDto,
  CanvasNodeDto,
  CanvasEdgeDto,
  LinkedCardDto,
  CreateCanvasNodeInput,
  UpdateCanvasNodeInput,
  CreateCanvasEdgeInput,
  UpdateCanvasEdgeInput,
} from '@moongatracker/shared-types';

const nodeInclude = { card: { include: { column: true } } } as const;

@Injectable()
export class CanvasService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertRead(user: any, projectId: string): Promise<void> {
    if (user?.type === 'agent') {
      if (user.projectId !== projectId)
        throw new ForbiddenException('Token is not scoped to this project');
      return;
    }
    await assertMembership(this.prisma, user.sub, projectId);
  }

  private async assertWrite(user: any, projectId: string): Promise<void> {
    if (user?.type === 'agent')
      throw new ForbiddenException('Agents cannot edit the canvas');
    await assertMembership(this.prisma, user.sub, projectId);
  }

  private async nodeProjectId(nodeId: string): Promise<{ projectId: string; cardId: string | null }> {
    const node = await this.prisma.canvasNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundException(`Canvas node ${nodeId} not found`);
    return { projectId: node.projectId, cardId: node.cardId };
  }

  private toLinkedCard(card: any): LinkedCardDto | null {
    if (!card) return null;
    return {
      id: card.id,
      boardId: card.boardId,
      title: card.title,
      columnTitle: card.column?.title ?? '',
      priority: card.priority ?? null,
    };
  }

  private toNodeDto(n: any): CanvasNodeDto {
    return {
      id: n.id,
      projectId: n.projectId,
      text: n.text,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      color: n.color ?? null,
      cardId: n.cardId ?? null,
      card: this.toLinkedCard(n.card),
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  private toEdgeDto(e: any): CanvasEdgeDto {
    return {
      id: e.id,
      projectId: e.projectId,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      label: e.label ?? null,
    };
  }

  async getCanvas(projectId: string, user: any): Promise<CanvasDto> {
    await this.assertRead(user, projectId);
    const [nodes, edges] = await Promise.all([
      this.prisma.canvasNode.findMany({ where: { projectId }, include: nodeInclude }),
      this.prisma.canvasEdge.findMany({ where: { projectId } }),
    ]);
    return { nodes: nodes.map((n) => this.toNodeDto(n)), edges: edges.map((e) => this.toEdgeDto(e)) };
  }

  async createNode(projectId: string, dto: CreateCanvasNodeInput, user: any): Promise<CanvasNodeDto> {
    await this.assertWrite(user, projectId);
    const node = await this.prisma.canvasNode.create({
      data: {
        projectId,
        text: dto.text ?? '',
        x: dto.x,
        y: dto.y,
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: nodeInclude,
    });
    return this.toNodeDto(node);
  }

  async updateNode(nodeId: string, dto: UpdateCanvasNodeInput, user: any): Promise<CanvasNodeDto> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    const node = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.x !== undefined && { x: dto.x }),
        ...(dto.y !== undefined && { y: dto.y }),
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: nodeInclude,
    });
    return this.toNodeDto(node);
  }

  async removeNode(nodeId: string, user: any): Promise<void> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    await this.prisma.canvasNode.delete({ where: { id: nodeId } });
  }

  async createEdge(projectId: string, dto: CreateCanvasEdgeInput, user: any): Promise<CanvasEdgeDto> {
    await this.assertWrite(user, projectId);
    const [src, tgt] = await Promise.all([
      this.prisma.canvasNode.findUnique({ where: { id: dto.sourceNodeId } }),
      this.prisma.canvasNode.findUnique({ where: { id: dto.targetNodeId } }),
    ]);
    if (!src || !tgt || src.projectId !== projectId || tgt.projectId !== projectId)
      throw new BadRequestException('Both nodes must belong to this project');
    const edge = await this.prisma.canvasEdge.create({
      data: { projectId, sourceNodeId: dto.sourceNodeId, targetNodeId: dto.targetNodeId, label: dto.label ?? null },
    });
    return this.toEdgeDto(edge);
  }

  async updateEdge(edgeId: string, dto: UpdateCanvasEdgeInput, user: any): Promise<CanvasEdgeDto> {
    const edge = await this.prisma.canvasEdge.findUnique({ where: { id: edgeId } });
    if (!edge) throw new NotFoundException(`Canvas edge ${edgeId} not found`);
    await this.assertWrite(user, edge.projectId);
    const updated = await this.prisma.canvasEdge.update({
      where: { id: edgeId },
      data: { ...(dto.label !== undefined && { label: dto.label }) },
    });
    return this.toEdgeDto(updated);
  }

  async removeEdge(edgeId: string, user: any): Promise<void> {
    const edge = await this.prisma.canvasEdge.findUnique({ where: { id: edgeId } });
    if (!edge) throw new NotFoundException(`Canvas edge ${edgeId} not found`);
    await this.assertWrite(user, edge.projectId);
    await this.prisma.canvasEdge.delete({ where: { id: edgeId } });
  }

  async createTaskFromNode(nodeId: string, dto: { boardId: string }, user: any): Promise<CanvasNodeDto> {
    const { projectId, cardId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    if (cardId) throw new BadRequestException('Node is already linked to a task');

    const board = await this.prisma.board.findUnique({ where: { id: dto.boardId } });
    if (!board || board.projectId !== projectId)
      throw new BadRequestException('Board does not belong to this project');

    const node = await this.prisma.canvasNode.findUnique({ where: { id: nodeId } });
    const firstColumn = await this.prisma.column.findFirst({
      where: { boardId: dto.boardId },
      orderBy: { order: 'asc' },
    });
    if (!firstColumn) throw new BadRequestException('Board has no columns');

    const title = (node?.text ?? '').trim().split('\n')[0].slice(0, 200) || 'Без названия';

    // order (per column) и number (per board) — как в CardsService.create;
    // number обязателен и уникален per board (@@unique([boardId, number])).
    const card = await this.prisma.$transaction(async (tx) => {
      const [orderAgg, numberAgg] = await Promise.all([
        tx.card.aggregate({
          where: { boardId: dto.boardId, columnId: firstColumn.id },
          _max: { order: true },
        }),
        tx.card.aggregate({
          where: { boardId: dto.boardId },
          _max: { number: true },
        }),
      ]);
      return tx.card.create({
        data: {
          boardId: dto.boardId,
          columnId: firstColumn.id,
          number: (numberAgg._max.number ?? 0) + 1,
          title,
          order: (orderAgg._max.order ?? -1) + 1,
          authorType: user?.type === 'agent' ? 'agent' : 'user',
          authorId: user?.sub ?? null,
        },
      });
    });
    const updated = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: { cardId: card.id },
      include: nodeInclude,
    });
    return this.toNodeDto(updated);
  }

  async linkTask(nodeId: string, dto: { cardId: string }, user: any): Promise<CanvasNodeDto> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    const card = await this.prisma.card.findUnique({
      where: { id: dto.cardId },
      include: { board: true, canvasNode: true },
    });
    if (!card || card.board.projectId !== projectId)
      throw new BadRequestException('Card does not belong to this project');
    if (card.canvasNode && card.canvasNode.id !== nodeId)
      throw new BadRequestException('Card is already linked to another node');
    const updated = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: { cardId: dto.cardId },
      include: nodeInclude,
    });
    return this.toNodeDto(updated);
  }

  async unlinkTask(nodeId: string, user: any): Promise<CanvasNodeDto> {
    const { projectId } = await this.nodeProjectId(nodeId);
    await this.assertWrite(user, projectId);
    const updated = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: { cardId: null },
      include: nodeInclude,
    });
    return this.toNodeDto(updated);
  }

  async seed(projectId: string, user: any): Promise<CanvasDto> {
    await this.assertWrite(user, projectId);
    const count = await this.prisma.canvasNode.count({ where: { projectId } });
    if (count === 0) {
      await this.prisma.$transaction(async (tx) => {
        const a = await tx.canvasNode.create({
          data: { projectId, text: '# Идея\nНачни отсюда — дабл-клик создаёт ноду.', x: 0, y: 0 },
        });
        const b = await tx.canvasNode.create({
          data: { projectId, text: 'Свяжи ноды стрелкой и преврати в задачу.', x: 360, y: 120 },
        });
        await tx.canvasEdge.create({
          data: { projectId, sourceNodeId: a.id, targetNodeId: b.id, label: null },
        });
      });
    }
    return this.getCanvas(projectId, user);
  }
}
