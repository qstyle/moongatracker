import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { CanvasController } from './canvas.controller';
import { CanvasService } from './canvas.service';

@Module({
  imports: [],
  controllers: [CanvasController],
  providers: [CanvasService, PrismaService],
})
export class CanvasModule {}
