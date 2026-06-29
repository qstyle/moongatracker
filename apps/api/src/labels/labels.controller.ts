import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { LabelDto } from '@moongatracker/shared-types';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { AttachLabelDto } from './dto/attach-label.dto';

@Controller()
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get('boards/:boardId/labels')
  list(@Param('boardId') boardId: string): Promise<LabelDto[]> {
    return this.labels.listForBoard(boardId);
  }

  @Post('boards/:boardId/labels')
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateLabelDto,
  ): Promise<LabelDto> {
    return this.labels.create(boardId, dto.name, dto.color);
  }

  @Post('cards/:cardId/labels')
  @HttpCode(204)
  attach(
    @Param('cardId') cardId: string,
    @Body() dto: AttachLabelDto,
  ): Promise<void> {
    return this.labels.attach(cardId, dto.labelId);
  }

  @Delete('cards/:cardId/labels/:labelId')
  @HttpCode(204)
  detach(
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
  ): Promise<void> {
    return this.labels.detach(cardId, labelId);
  }
}
