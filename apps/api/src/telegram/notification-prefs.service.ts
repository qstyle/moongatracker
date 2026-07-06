import { Injectable } from '@nestjs/common';
import { PrismaService } from '@moonga-studio/data-access';
import {
  NotificationPreferences,
  NotificationPreferencesUpdate,
} from '@moonga-studio/shared-types';

/** Defaults when a user has no preferences row — everything enabled. */
const DEFAULTS: NotificationPreferences = {
  cardMoved: true,
  cardAssigned: true,
  cardCommented: true,
  cardAssignedToAgent: true,
};

/**
 * Owns per-user notification toggles. An absent row is treated as all-on, so
 * users never miss notifications until they explicitly opt out.
 */
@Injectable()
export class NotificationPrefsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });
    return row ? pick(row) : { ...DEFAULTS };
  }

  async updatePreferences(
    userId: string,
    patch: NotificationPreferencesUpdate,
  ): Promise<NotificationPreferences> {
    const row = await this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: patch,
    });
    return pick(row);
  }
}

/** Project a stored row down to the wire shape (drops id/userId/updatedAt). */
function pick(row: NotificationPreferences): NotificationPreferences {
  return {
    cardMoved: row.cardMoved,
    cardAssigned: row.cardAssigned,
    cardCommented: row.cardCommented,
    cardAssignedToAgent: row.cardAssignedToAgent,
  };
}
