import { Controller, Get, Post, Param, Req, HttpCode } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityDto } from '@moongatracker/shared-types';

@Controller()
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('cards/:cardId/activity')
  listForCard(
    @Param('cardId') cardId: string,
    @Req() req: any,
  ): Promise<ActivityDto[]> {
    return this.activity.listForCard(cardId, req.user.sub);
  }

  @Post('activity/:id/revert')
  @HttpCode(204)
  revert(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.activity.revert(id, req.user.sub);
  }
}
