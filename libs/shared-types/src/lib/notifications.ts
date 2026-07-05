/**
 * Per-user notification toggles. Each key gates one notification type; an
 * absent preferences row means every type is enabled (defaults on).
 */
export interface NotificationPreferences {
  /** A card I authored or am assigned to was moved between columns. */
  cardMoved: boolean;
  /** A card was assigned to me. */
  cardAssigned: boolean;
  /** A new comment was posted on a card I'm assigned to. */
  cardCommented: boolean;
  /** A card I authored was assigned to an agent. */
  cardAssignedToAgent: boolean;
}

/** Body of PATCH /api/telegram/preferences — a partial update. */
export type NotificationPreferencesUpdate = Partial<NotificationPreferences>;
