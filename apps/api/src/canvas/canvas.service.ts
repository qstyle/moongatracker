import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import {
  CanvasDoc,
  CanvasNode,
  LinkedCardDto,
} from '@moongatracker/shared-types';

function starterDoc(): CanvasDoc {
  return {
    nodes: [
      {
        id: 'n1',
        type: 'markdown',
        position: { x: 0, y: 0 },
        width: 240,
        height: 140,
        data: {
          text: '# Идея\nДабл-клик по полотну создаёт ноду. Потяни от края к другой — связь.',
        },
      },
      {
        id: 'n2',
        type: 'markdown',
        position: { x: 360, y: 160 },
        width: 240,
        height: 140,
        data: {
          text: 'Из ноды можно создать задачу или привязать существующую.',
        },
      },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'markdown' }],
  };
}

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

  /** Читает документ; резолвит связанные карточки (свежие title/column/priority);
   * повисшие cardId (карточка удалена) обнуляет. */
  async getCanvas(projectId: string, user: any): Promise<CanvasDoc> {
    await this.assertRead(user, projectId);
    const row = await this.prisma.canvas.findUnique({ where: { projectId } });
    const doc = (row?.data as unknown as CanvasDoc) ?? starterDoc();
    const nodes: CanvasNode[] = Array.isArray(doc.nodes) ? doc.nodes : [];
    const edges = Array.isArray(doc.edges) ? doc.edges : [];

    const cardIds = nodes
      .map((n) => n.data?.cardId)
      .filter((id): id is string => !!id);
    const cardMap = new Map<string, any>();
    if (cardIds.length) {
      const cards = await this.prisma.card.findMany({
        where: { id: { in: cardIds } },
        include: { column: true },
      });
      for (const c of cards) cardMap.set(c.id, c);
    }

    const resolvedNodes = nodes.map((n) => {
      const cardId = n.data?.cardId ?? null;
      if (!cardId) return { ...n, data: { ...n.data, card: null } };
      const c = cardMap.get(cardId);
      if (!c) return { ...n, data: { ...n.data, cardId: null, card: null } };
      const card: LinkedCardDto = {
        id: c.id,
        boardId: c.boardId,
        title: c.title,
        columnTitle: c.column?.title ?? '',
        priority: c.priority ?? null,
      };
      return { ...n, data: { ...n.data, card } };
    });

    return {
      nodes: resolvedNodes,
      edges,
      ...(doc.viewport ? { viewport: doc.viewport } : {}),
    };
  }

  /** Сохраняет весь документ (upsert). Резолв-поле data.card в БД не пишем (только cardId). */
  async saveCanvas(
    projectId: string,
    user: any,
    doc: CanvasDoc,
  ): Promise<{ ok: true }> {
    await this.assertWrite(user, projectId);
    const nodes = (Array.isArray(doc.nodes) ? doc.nodes : []).map((n) => {
      const data = { ...(n.data ?? {}) } as Record<string, unknown>;
      delete data.card;
      return { ...n, data };
    });
    const clean = {
      nodes,
      edges: Array.isArray(doc.edges) ? doc.edges : [],
      ...(doc.viewport ? { viewport: doc.viewport } : {}),
    };
    await this.prisma.canvas.upsert({
      where: { projectId },
      create: { projectId, data: clean as any },
      update: { data: clean as any },
    });
    return { ok: true };
  }

  /** Создаёт карточку из ноды в первой колонке доски. Возвращает cardId + summary;
   * фронт проставит node.data.cardId и сохранит документ. */
  async createTaskFromNode(
    projectId: string,
    nodeId: string,
    boardId: string,
    user: any,
  ): Promise<{ cardId: string; card: LinkedCardDto }> {
    await this.assertWrite(user, projectId);

    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board || board.projectId !== projectId)
      throw new BadRequestException('Board does not belong to this project');

    const firstColumn = await this.prisma.column.findFirst({
      where: { boardId },
      orderBy: { order: 'asc' },
    });
    if (!firstColumn) throw new BadRequestException('Board has no columns');

    const row = await this.prisma.canvas.findUnique({ where: { projectId } });
    const doc = (row?.data as unknown as CanvasDoc) ?? { nodes: [], edges: [] };
    const node = (doc.nodes ?? []).find((n) => n.id === nodeId);
    const title =
      String(node?.data?.text ?? '')
        .trim()
        .split('\n')[0]
        .slice(0, 200) || 'Без названия';

    const card = await this.prisma.$transaction(async (tx: any) => {
      const [orderAgg, numberAgg] = await Promise.all([
        tx.card.aggregate({
          where: { boardId, columnId: firstColumn.id },
          _max: { order: true },
        }),
        tx.card.aggregate({ where: { boardId }, _max: { number: true } }),
      ]);
      return tx.card.create({
        data: {
          boardId,
          columnId: firstColumn.id,
          number: (numberAgg._max.number ?? 0) + 1,
          title,
          order: (orderAgg._max.order ?? -1) + 1,
          authorType: 'user',
          authorId: user?.sub ?? null,
        },
      });
    });

    return {
      cardId: card.id,
      card: {
        id: card.id,
        boardId: card.boardId,
        title: card.title,
        columnTitle: firstColumn.title,
        priority: card.priority ?? null,
      },
    };
  }
}
