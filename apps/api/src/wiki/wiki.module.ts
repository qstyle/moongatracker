import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { WikiController } from './wiki.controller';
import { WikiService } from './wiki.service';

@Module({
  imports: [],
  controllers: [WikiController],
  providers: [WikiService, PrismaService],
})
export class WikiModule {}
