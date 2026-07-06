import { Module } from '@nestjs/common';
import { PrismaService } from '@moonga-studio/data-access';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';

@Module({
  controllers: [StagesController],
  providers: [PrismaService, StagesService],
})
export class StagesModule {}
