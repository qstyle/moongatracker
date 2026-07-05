import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';

@Module({
  controllers: [ProposalsController],
  providers: [PrismaService, ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
