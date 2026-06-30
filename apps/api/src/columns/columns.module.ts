import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';

@Module({
  imports: [],
  controllers: [ColumnsController],
  providers: [ColumnsService, PrismaService],
})
export class ColumnsModule {}
