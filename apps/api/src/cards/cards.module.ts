import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, PrismaService],
})
export class CardsModule {}
