import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@moongatracker/data-access';
import {
  formatCardKey,
  NotificationPreferences,
} from '@moongatracker/shared-types';
import { TelegramService } from './telegram.service';
import {
  CARD_ASSIGNED,
  CARD_COMMENTED,
  CARD_MOVED,
  CardAssignedPayload,
  CardCommentedPayload,
  CardMovedPayload,
  EventActor,
} from './telegram.events';

/**
 * Turn a set of candidate actors into the user ids that should be notified:
 * only human users, never the initiator of the action, de-duplicated. Pure and
 * side-effect-free so the recipient rules can be unit-tested in isolation.
 */
export function recipientUserIds(
  candidates: Array<EventActor | null | undefined>,
  actor: EventActor,
): string[] {
  const out = new Set<string>();
  for (const c of candidates) {
    if (!c || c.type !== 'user' || !c.id) continue;
    if (actor.type === 'user' && actor.id === c.id) continue; // not your own action
    out.add(c.id);
  }
  return [...out];
}

interface CardContext {
  key: string;
  title: string;
  boardId: string;
  author: EventActor | null;
  assignee: EventActor | null;
}

@Injectable()
export class TelegramNotifierService {
  private readonly logger = new Logger(TelegramNotifierService.name);
  private readonly webUrl = (process.env['WEB_PUBLIC_URL'] ?? '').replace(
    /\/$/,
    '',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  @OnEvent(CARD_MOVED)
  async handleMoved(payload: CardMovedPayload): Promise<void> {
    const ctx = await this.cardContext(payload.cardId);
    if (!ctx) return;
    const recipients = recipientUserIds(
      [ctx.author, ctx.assignee],
      payload.actor,
    );
    if (!recipients.length) return;

    const [from, to] = await Promise.all([
      this.columnTitle(payload.fromColumnId),
      this.columnTitle(payload.toColumnId),
    ]);
    const who = await this.actorName(payload.actor);
    const text =
      `🔀 ${ctx.key} «${ctx.title}»\n` +
      `${from} → ${to}${who ? ` · ${who}` : ''}` +
      this.link(ctx);
    await this.deliver(recipients, text, 'cardMoved');
  }

  @OnEvent(CARD_ASSIGNED)
  async handleAssigned(payload: CardAssignedPayload): Promise<void> {
    // Assigning to an agent has no human recipient of its own — instead the
    // card's author is told their card was handed off to an agent.
    if (payload.assignee.type === 'agent') {
      await this.handleAssignedToAgent(payload);
      return;
    }
    const recipients = recipientUserIds([payload.assignee], payload.actor);
    if (!recipients.length) return;
    const ctx = await this.cardContext(payload.cardId);
    if (!ctx) return;
    const who = await this.actorName(payload.actor);
    const text =
      `📌 Вам назначена карточка ${ctx.key} «${ctx.title}»` +
      `${who ? ` · ${who}` : ''}` +
      this.link(ctx);
    await this.deliver(recipients, text, 'cardAssigned');
  }

  private async handleAssignedToAgent(
    payload: CardAssignedPayload,
  ): Promise<void> {
    const ctx = await this.cardContext(payload.cardId);
    if (!ctx) return;
    const recipients = recipientUserIds([ctx.author], payload.actor);
    if (!recipients.length) return;
    const agentName = (await this.actorName(payload.assignee)) ?? 'Агент';
    const text =
      `🤖 ${ctx.key} «${ctx.title}» назначена агенту ${agentName}` +
      this.link(ctx);
    await this.deliver(recipients, text, 'cardAssignedToAgent');
  }

  @OnEvent(CARD_COMMENTED)
  async handleCommented(payload: CardCommentedPayload): Promise<void> {
    const ctx = await this.cardContext(payload.cardId);
    if (!ctx) return;
    const recipients = recipientUserIds([ctx.assignee], payload.actor);
    if (!recipients.length) return;
    const who = await this.actorName(payload.actor);
    const text =
      `💬 Новый комментарий к ${ctx.key} «${ctx.title}»` +
      `${who ? ` · ${who}` : ''}` +
      this.link(ctx);
    await this.deliver(recipients, text, 'cardCommented');
  }

  private async cardContext(cardId: string): Promise<CardContext | null> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { board: true },
    });
    if (!card) return null;
    return {
      key: formatCardKey(card.board.name, card.board.seq, card.number),
      title: card.title,
      boardId: card.boardId,
      author: card.authorId
        ? { type: card.authorType as 'user' | 'agent', id: card.authorId }
        : null,
      assignee: card.assigneeType
        ? {
            type: card.assigneeType as 'user' | 'agent',
            id: card.assigneeId ?? null,
          }
        : null,
    };
  }

  private async columnTitle(columnId: string): Promise<string> {
    const col = await this.prisma.column.findUnique({
      where: { id: columnId },
    });
    return col?.title ?? '—';
  }

  private async actorName(actor: EventActor): Promise<string | null> {
    if (!actor.id) return null;
    if (actor.type === 'agent') {
      const token = await this.prisma.apiToken.findUnique({
        where: { id: actor.id },
      });
      return token?.name ?? 'Агент';
    }
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    return user?.name ?? null;
  }

  private link(ctx: CardContext): string {
    if (!this.webUrl) return '';
    return `\n${this.webUrl}/boards/${ctx.boardId}/cards/${ctx.key}`;
  }

  private async deliver(
    userIds: string[],
    text: string,
    prefKey: keyof NotificationPreferences,
  ): Promise<void> {
    const [links, prefs] = await Promise.all([
      this.prisma.telegramLink.findMany({ where: { userId: { in: userIds } } }),
      this.prisma.notificationPreferences.findMany({
        where: { userId: { in: userIds } },
      }),
    ]);
    // Only an explicit `false` opts out; a missing row/field means enabled.
    const optedOut = new Set(
      prefs.filter((p) => p[prefKey] === false).map((p) => p.userId),
    );
    await Promise.all(
      links
        .filter((l) => !optedOut.has(l.userId))
        .map((l) => this.telegram.sendMessage(l.chatId, text)),
    );
  }
}
