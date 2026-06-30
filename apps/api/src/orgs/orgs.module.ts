import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';

@Module({
  imports: [],
  controllers: [OrgsController],
  providers: [OrgsService, PrismaService],
})
export class OrgsModule {}
