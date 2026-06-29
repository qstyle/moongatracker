import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';

@Module({
  controllers: [LabelsController],
  providers: [LabelsService, PrismaService],
})
export class LabelsModule {}
