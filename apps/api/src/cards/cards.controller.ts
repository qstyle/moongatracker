import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { CardDto } from '@moongatracker/shared-types';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller('cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Post()
  create(@Body() dto: CreateCardDto, @Req() req: any): Promise<CardDto> {
    return this.cards.create(dto, req.user);
  }

  @Get('by-board/:boardId/number/:number')
  getByNumber(
    @Param('boardId') boardId: string,
    @Param('number') number: string,
    @Req() req: any,
  ): Promise<CardDto> {
    return this.cards.getByBoardAndNumber(boardId, Number(number), req.user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: any): Promise<CardDto> {
    return this.cards.getById(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
    @Req() req: any,
  ): Promise<CardDto> {
    return this.cards.update(id, dto, req.user);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.cards.remove(id, req.user);
  }
}
