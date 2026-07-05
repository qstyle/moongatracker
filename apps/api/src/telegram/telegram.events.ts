/**
 * Domain events emitted by CardsService / CommentsService and consumed by the
 * Telegram notifier via @OnEvent. The event bus (@nestjs/event-emitter)
 * decouples notification delivery from the write path.
 */

export const CARD_MOVED = 'card.moved';
export const CARD_ASSIGNED = 'card.assigned';
export const CARD_COMMENTED = 'card.commented';

/** Who performed the action — used to avoid notifying people about their own. */
export interface EventActor {
  type: 'user' | 'agent';
  id: string | null;
}

export interface CardMovedPayload {
  cardId: string;
  actor: EventActor;
  fromColumnId: string;
  toColumnId: string;
}

export interface CardAssignedPayload {
  cardId: string;
  actor: EventActor;
  assignee: EventActor;
}

export interface CardCommentedPayload {
  cardId: string;
  actor: EventActor;
}
