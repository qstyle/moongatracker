import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  controllers: [BoardsController],
  providers: [BoardsService, PrismaService],
})
export class BoardsModule {}
