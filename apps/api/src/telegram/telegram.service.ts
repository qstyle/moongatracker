import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Bot } from 'grammy';
import { TelegramLinkService } from './telegram-link.service';

/**
 * Owns the Telegram bot transport: a single shared bot (long-polling) that all
 * users connect to. Dormant when TELEGRAM_BOT_TOKEN is unset — every method is
 * a no-op, so the app runs without Telegram configured (mirrors S3Service).
 */
@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env['TELEGRAM_BOT_TOKEN'] ?? '';
  private bot: Bot | null = null;
  private botUsername: string | null = null;

  constructor(private readonly links: TelegramLinkService) {}

  get enabled(): boolean {
    return this.token.length > 0;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
      return;
    }
    try {
      const bot = new Bot(this.token);
      bot.command('start', async (ctx) => {
        const code = (ctx.match ?? '').trim();
        const chatId = String(ctx.chat.id);
        if (!code) {
          await ctx.reply(
            'Откройте настройки MoonGaTracker и нажмите «Подключить Telegram».',
          );
          return;
        }
        const result = await this.links.consume(code, chatId);
        if (result.ok) {
          await ctx.reply('✅ Telegram подключён. Буду присылать уведомления.');
        } else if (result.reason === 'expired') {
          await ctx.reply('⏳ Код истёк. Сгенерируйте новый в настройках.');
        } else {
          await ctx.reply('❌ Код недействителен. Проверьте ссылку.');
        }
      });
      bot.catch((err) =>
        this.logger.error(`Bot error: ${err.error}`, err.stack),
      );

      // init() populates botInfo (username) via getMe; start() runs long-polling
      // in the background — do not await it, it resolves only on stop().
      await bot.init();
      this.botUsername = bot.botInfo.username;
      this.bot = bot;
      void bot.start({ onStart: () => this.logger.log('Telegram bot started') });
    } catch (err) {
      this.logger.error(`Failed to start Telegram bot: ${String(err)}`);
      this.bot = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) await this.bot.stop();
  }

  /** Deep link that redeems a one-time onboarding code. */
  buildDeepLink(code: string): string {
    const name = this.botUsername ?? '';
    return `https://t.me/${name}?start=${code}`;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.api.sendMessage(chatId, text);
    } catch (err) {
      this.logger.warn(`Failed to send message to ${chatId}: ${String(err)}`);
    }
  }
}
