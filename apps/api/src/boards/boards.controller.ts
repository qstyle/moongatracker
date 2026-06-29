import { Controller, Get } from '@nestjs/common';
import { BoardDto } from '@moongatracker/shared-types';
import { BoardsService } from './boards.service';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get()
  list(): Promise<BoardDto[]> {
    return this.boards.listBoards();
  }
}
