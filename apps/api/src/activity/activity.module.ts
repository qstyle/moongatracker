import { Module } from '@nestjs/common';
import { PrismaService } from '@moonga-studio/data-access';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, PrismaService],
  exports: [ActivityService],
})
export class ActivityModule {}
