import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { TelegramController } from './telegram.controller';
import { TelegramLinkService } from './telegram-link.service';
import { TelegramNotifierService } from './telegram-notifier.service';
import { TelegramService } from './telegram.service';
import { NotificationPrefsService } from './notification-prefs.service';

@Module({
  controllers: [TelegramController],
  providers: [
    PrismaService,
    TelegramLinkService,
    TelegramService,
    TelegramNotifierService,
    NotificationPrefsService,
  ],
})
export class TelegramModule {}
