import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { TelegramLinkStatus } from '@moongatracker/shared-types';

/** Onboarding codes are valid for 10 minutes. */
const CODE_TTL_MS = 10 * 60 * 1000;

export interface ConsumeResult {
  ok: boolean;
  /** 'expired' | 'unknown' when ok === false. */
  reason?: 'expired' | 'unknown';
}

/**
 * Owns the Telegram<->user linking data: one-time onboarding codes and the
 * persistent TelegramLink. Knows nothing about the bot transport — see
 * TelegramService for the deep-link URL and message delivery.
 */
@Injectable()
export class TelegramLinkService {
  constructor(private readonly prisma: PrismaService) {}

  /** Issue a fresh one-time code for the deep link, invalidating older ones. */
  async createCode(userId: string): Promise<{ code: string; expiresAt: Date }> {
    const code = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.telegramLinkCode.deleteMany({ where: { userId } }),
      this.prisma.telegramLinkCode.create({
        data: { code, userId, expiresAt },
      }),
    ]);
    return { code, expiresAt };
  }

  /** Redeem a code from the bot's /start handler and bind the chat. */
  async consume(code: string, chatId: string): Promise<ConsumeResult> {
    const record = await this.prisma.telegramLinkCode.findUnique({
      where: { code },
    });
    if (!record) return { ok: false, reason: 'unknown' };
    if (record.expiresAt.getTime() < Date.now()) {
      await this.prisma.telegramLinkCode.delete({ where: { code } });
      return { ok: false, reason: 'expired' };
    }

    await this.prisma.$transaction([
      // one chat maps to at most one user
      this.prisma.telegramLink.deleteMany({
        where: { chatId, NOT: { userId: record.userId } },
      }),
      this.prisma.telegramLink.upsert({
        where: { userId: record.userId },
        create: { userId: record.userId, chatId },
        update: { chatId },
      }),
      this.prisma.telegramLinkCode.deleteMany({
        where: { userId: record.userId },
      }),
    ]);
    return { ok: true };
  }

  async getStatus(userId: string): Promise<TelegramLinkStatus> {
    const link = await this.prisma.telegramLink.findUnique({
      where: { userId },
    });
    return link
      ? { connected: true, chatId: link.chatId }
      : { connected: false };
  }

  async unlink(userId: string): Promise<void> {
    await this.prisma.telegramLink.deleteMany({ where: { userId } });
  }
}
