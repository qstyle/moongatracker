import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  NotificationPreferences,
  TelegramLinkCodeResponse,
  TelegramLinkStatus,
} from '@moongatracker/shared-types';
import { TelegramLinkService } from './telegram-link.service';
import { TelegramService } from './telegram.service';
import { NotificationPrefsService } from './notification-prefs.service';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly links: TelegramLinkService,
    private readonly telegram: TelegramService,
    private readonly prefs: NotificationPrefsService,
  ) {}

  @Post('link-code')
  async createLinkCode(@Req() req: any): Promise<TelegramLinkCodeResponse> {
    const userId = requireUserId(req);
    if (!this.telegram.enabled)
      throw new ServiceUnavailableException('Telegram bot is not configured');
    const { code, expiresAt } = await this.links.createCode(userId);
    return {
      code,
      url: this.telegram.buildDeepLink(code),
      expiresAt: expiresAt.toISOString(),
    };
  }

  @Get('link')
  status(@Req() req: any): Promise<TelegramLinkStatus> {
    return this.links.getStatus(requireUserId(req));
  }

  @Delete('link')
  @HttpCode(204)
  async unlink(@Req() req: any): Promise<void> {
    await this.links.unlink(requireUserId(req));
  }

  @Get('preferences')
  preferences(@Req() req: any): Promise<NotificationPreferences> {
    return this.prefs.getPreferences(requireUserId(req));
  }

  @Patch('preferences')
  updatePreferences(
    @Body() dto: UpdateNotificationPrefsDto,
    @Req() req: any,
  ): Promise<NotificationPreferences> {
    return this.prefs.updatePreferences(requireUserId(req), dto);
  }
}

function requireUserId(req: any): string {
  if (req.user?.type !== 'user')
    throw new ForbiddenException('Only users can manage Telegram links');
  return req.user.sub;
}
