import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ColumnDto } from '@moonga-studio/shared-types';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Controller('columns')
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Post()
  create(
    @Body() dto: CreateColumnDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ColumnDto> {
    return this.columns.create(dto.boardId, dto.title, req.user.sub);
  }

  @Patch('reorder')
  reorder(
    @Body() dto: ReorderColumnsDto,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.columns.reorder(dto.boardId, dto.orderedIds, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ColumnDto> {
    return this.columns.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.columns.remove(id, req.user.sub);
  }
}
