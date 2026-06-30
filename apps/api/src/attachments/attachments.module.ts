import { Module } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { S3Service } from './s3.service';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, S3Service, PrismaService],
})
export class AttachmentsModule {}
