import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { CanvasDoc, LinkedCardDto } from '@moongatracker/shared-types';
import { CanvasService } from './canvas.service';
import { SaveCanvasDto } from './dto/save-canvas.dto';
import { CreateTaskDto } from './dto/create-task.dto';

@Controller()
export class CanvasController {
  constructor(private readonly canvas: CanvasService) {}

  @Get('projects/:projectId/canvas')
  get(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ): Promise<CanvasDoc> {
    return this.canvas.getCanvas(projectId, req.user);
  }

  @Put('projects/:projectId/canvas')
  save(
    @Param('projectId') projectId: string,
    @Body() dto: SaveCanvasDto,
    @Req() req: any,
  ): Promise<{ ok: true }> {
    return this.canvas.saveCanvas(projectId, req.user, dto as unknown as CanvasDoc);
  }

  @Post('projects/:projectId/canvas/nodes/:nodeId/create-task')
  createTask(
    @Param('projectId') projectId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: CreateTaskDto,
    @Req() req: any,
  ): Promise<{ cardId: string; card: LinkedCardDto }> {
    return this.canvas.createTaskFromNode(projectId, nodeId, dto.boardId, req.user);
  }
}
