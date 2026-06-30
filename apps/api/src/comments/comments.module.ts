import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { ActivityModule } from '../activity/activity.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [ActivityModule],
  controllers: [CommentsController],
  providers: [CommentsService, PrismaService],
})
export class CommentsModule {}
