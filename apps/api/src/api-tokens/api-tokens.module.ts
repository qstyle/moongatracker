import { Module } from '@nestjs/common';
import { PrismaService } from '@moonga-studio/data-access';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';

@Module({
  controllers: [ApiTokensController],
  providers: [ApiTokensService, PrismaService],
})
export class ApiTokensModule {}
