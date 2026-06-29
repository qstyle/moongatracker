import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommentDto } from '@moongatracker/shared-types';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('cards/:cardId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Param('cardId') cardId: string): Promise<CommentDto[]> {
    return this.comments.list(cardId);
  }

  @Post()
  create(
    @Param('cardId') cardId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.comments.create(cardId, dto.body);
  }
}
