import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import {
  ActorDto,
  BoardDto,
  BoardSummaryDto,
} from '@moongatracker/shared-types';
import { RequestActor } from '@moongatracker/data-access';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller()
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get('projects/:projectId/boards')
  listForProject(
    @Param('projectId') projectId: string,
    @Request() req: { user: RequestActor },
  ): Promise<BoardSummaryDto[]> {
    return this.boards.listForProject(projectId, req.user);
  }

  @Post('projects/:projectId/boards')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoardDto,
    @Request() req: { user: RequestActor },
  ): Promise<BoardSummaryDto> {
    return this.boards.create(projectId, dto.name, req.user, dto.stageId);
  }

  @Get('boards/:boardId')
  getWithColumns(
    @Param('boardId') boardId: string,
    @Request() req: { user: RequestActor },
  ): Promise<BoardDto> {
    return this.boards.getWithColumns(boardId, req.user);
  }

  @Patch('boards/:boardId')
  update(
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
    @Request() req: { user: RequestActor },
  ): Promise<BoardSummaryDto> {
    return this.boards.update(boardId, req.user, dto.name!);
  }

  @Delete('boards/:boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBoard(
    @Param('boardId') boardId: string,
    @Request() req: { user: RequestActor },
  ): Promise<void> {
    return this.boards.delete(boardId, req.user);
  }

  @Get('boards/:boardId/actors')
  getActors(
    @Param('boardId') boardId: string,
    @Request() req: { user: RequestActor },
  ): Promise<ActorDto[]> {
    return this.boards.getActors(boardId, req.user);
  }
}
