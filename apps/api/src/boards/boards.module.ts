import { Module } from '@nestjs/common';
import { PrismaService } from '@moonga-studio/data-access';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  imports: [],
  controllers: [BoardsController],
  providers: [BoardsService, PrismaService],
})
export class BoardsModule {}
