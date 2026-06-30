import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { ActivityModule } from '../activity/activity.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
  imports: [ActivityModule],
  controllers: [CardsController],
  providers: [CardsService, PrismaService],
})
export class CardsModule {}
