import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  assertMembership,
  assertProjectAccess,
  PrismaService,
  RequestActor,
} from '@moongatracker/data-access';
import { formatCardKey, ProposalDto } from '@moongatracker/shared-types';
import { PROPOSAL_CREATED } from '../telegram/telegram.events';
import { toProposalDto } from './proposal.mapper';

type Decision = 'approved' | 'rejected';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Any actor with access to the card's project may propose its deletion. */
  async createDeleteCard(
    cardId: string,
    reason: string | null,
    user: RequestActor,
  ): Promise<ProposalDto> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { board: true },
    });
    if (!card) throw new NotFoundException('Card not found');
    await assertProjectAccess(this.prisma, user, card.board.projectId);

    const actor =
      user?.type === 'agent'
        ? { type: 'agent', id: (user as any).tokenId ?? null }
        : { type: 'user', id: (user as any).sub ?? null };
    const cardKey = formatCardKey(card.board.name, card.board.seq, card.number);

    const proposal = await this.prisma.proposal.create({
      data: {
        projectId: card.board.projectId,
        cardId: card.id,
        action: 'delete_card',
        reason,
        payload: { cardTitle: card.title, cardKey },
        actorType: actor.type,
        actorId: actor.id,
      },
    });
    this.events.emit(PROPOSAL_CREATED, { proposalId: proposal.id });
    return toProposalDto(proposal);
  }

  /** Pending proposals in a single project (decider only). */
  async listPending(projectId: string, user: RequestActor): Promise<ProposalDto[]> {
    await this.assertDecider(projectId, user);
    const rows = await this.prisma.proposal.findMany({
      where: { projectId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toProposalDto);
  }

  /** The caller's approval inbox: pending proposals across projects they decide. */
  async listMyPending(user: RequestActor): Promise<ProposalDto[]> {
    if (user?.type !== 'user') return [];
    const userId = user.sub;
    const [owned, memberOwnerless] = await Promise.all([
      this.prisma.project.findMany({
        where: { ownerId: userId },
        select: { id: true },
      }),
      this.prisma.membership.findMany({
        where: { userId, project: { ownerId: null } },
        select: { projectId: true },
      }),
    ]);
    const ids = [
      ...owned.map((p) => p.id),
      ...memberOwnerless.map((m) => m.projectId),
    ];
    if (!ids.length) return [];
    const rows = await this.prisma.proposal.findMany({
      where: { projectId: { in: ids }, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toProposalDto);
  }

  approve(id: string, user: RequestActor): Promise<ProposalDto> {
    return this.resolve(id, 'approved', requireUserId(user));
  }

  reject(id: string, user: RequestActor): Promise<ProposalDto> {
    return this.resolve(id, 'rejected', requireUserId(user));
  }

  /** Telegram callback path: resolve the chat to a user, then apply. */
  async decideFromChat(
    proposalId: string,
    decision: Decision,
    chatId: string,
  ): Promise<{ ok: boolean; text: string }> {
    const link = await this.prisma.telegramLink.findUnique({
      where: { chatId },
    });
    if (!link) return { ok: false, text: 'Аккаунт Telegram не связан.' };
    try {
      const p = await this.resolve(proposalId, decision, link.userId);
      const label = `${p.cardKey ?? ''} «${p.cardTitle ?? ''}»`.trim();
      return {
        ok: true,
        text: decision === 'approved' ? `✅ Удалено: ${label}` : `❌ Отклонено: ${label}`,
      };
    } catch (e) {
      if (e instanceof ForbiddenException)
        return { ok: false, text: 'Только владелец проекта может подтверждать.' };
      if (e instanceof BadRequestException)
        return { ok: false, text: 'Запрос уже обработан.' };
      return { ok: false, text: 'Не удалось обработать запрос.' };
    }
  }

  private async resolve(
    id: string,
    status: Decision,
    userId: string,
  ): Promise<ProposalDto> {
    const p = await this.prisma.proposal.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Proposal not found');
    await this.assertDecider(p.projectId, { type: 'user', sub: userId });
    if (p.status !== 'pending')
      throw new BadRequestException('Proposal already resolved');

    if (status === 'approved' && p.action === 'delete_card' && p.cardId) {
      // deleteMany: tolerate the card having been removed in the meantime.
      await this.prisma.card.deleteMany({ where: { id: p.cardId } });
    }
    const updated = await this.prisma.proposal.update({
      where: { id },
      data: { status, resolvedById: userId, resolvedAt: new Date() },
    });
    return toProposalDto(updated);
  }

  /**
   * The decider is the project owner when set; for legacy/personal projects
   * without an explicit owner, any member may decide.
   */
  private async assertDecider(projectId: string, user: RequestActor): Promise<void> {
    if (user?.type !== 'user')
      throw new ForbiddenException('Only a project member can decide');
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId) {
      if (project.ownerId !== user.sub)
        throw new ForbiddenException('Only the project owner can decide');
      return;
    }
    await assertMembership(this.prisma, user.sub, projectId);
  }
}

function requireUserId(user: RequestActor): string {
  if (user?.type !== 'user')
    throw new ForbiddenException('Only a user can decide proposals');
  return user.sub;
}
