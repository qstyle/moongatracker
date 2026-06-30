import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
} from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { AttachmentDto } from '@moongatracker/shared-types';

@Controller()
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('cards/:cardId/attachments/presign')
  presignUpload(
    @Param('cardId') cardId: string,
    @Body() dto: PresignUploadDto,
    @Req() req: any,
  ): Promise<{ presignedUrl: string; attachmentId: string }> {
    return this.attachments.presignUpload(
      cardId,
      dto.filename,
      dto.mimeType,
      dto.size,
      req.user.sub,
    );
  }

  @Get('cards/:cardId/attachments')
  listForCard(
    @Param('cardId') cardId: string,
    @Req() req: any,
  ): Promise<AttachmentDto[]> {
    return this.attachments.listForCard(cardId, req.user.sub);
  }

  @Delete('attachments/:id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.attachments.remove(id, req.user.sub);
  }
}
