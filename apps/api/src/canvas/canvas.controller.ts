import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { CanvasDto, CanvasNodeDto, CanvasEdgeDto } from '@moongatracker/shared-types';
import { CanvasService } from './canvas.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { CreateEdgeDto } from './dto/create-edge.dto';
import { UpdateEdgeDto } from './dto/update-edge.dto';
import { CreateTaskFromNodeDto } from './dto/create-task-from-node.dto';
import { LinkTaskDto } from './dto/link-task.dto';

@Controller()
export class CanvasController {
  constructor(private readonly canvas: CanvasService) {}

  @Get('projects/:projectId/canvas')
  get(@Param('projectId') projectId: string, @Req() req: any): Promise<CanvasDto> {
    return this.canvas.getCanvas(projectId, req.user);
  }

  @Post('projects/:projectId/canvas/seed')
  seed(@Param('projectId') projectId: string, @Req() req: any): Promise<CanvasDto> {
    return this.canvas.seed(projectId, req.user);
  }

  @Post('projects/:projectId/canvas/nodes')
  createNode(@Param('projectId') projectId: string, @Body() dto: CreateNodeDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.createNode(projectId, dto, req.user);
  }

  @Patch('canvas/nodes/:nodeId')
  updateNode(@Param('nodeId') nodeId: string, @Body() dto: UpdateNodeDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.updateNode(nodeId, dto, req.user);
  }

  @Delete('canvas/nodes/:nodeId')
  @HttpCode(204)
  removeNode(@Param('nodeId') nodeId: string, @Req() req: any): Promise<void> {
    return this.canvas.removeNode(nodeId, req.user);
  }

  @Post('projects/:projectId/canvas/edges')
  createEdge(@Param('projectId') projectId: string, @Body() dto: CreateEdgeDto, @Req() req: any): Promise<CanvasEdgeDto> {
    return this.canvas.createEdge(projectId, dto, req.user);
  }

  @Patch('canvas/edges/:edgeId')
  updateEdge(@Param('edgeId') edgeId: string, @Body() dto: UpdateEdgeDto, @Req() req: any): Promise<CanvasEdgeDto> {
    return this.canvas.updateEdge(edgeId, dto, req.user);
  }

  @Delete('canvas/edges/:edgeId')
  @HttpCode(204)
  removeEdge(@Param('edgeId') edgeId: string, @Req() req: any): Promise<void> {
    return this.canvas.removeEdge(edgeId, req.user);
  }

  @Post('canvas/nodes/:nodeId/create-task')
  createTask(@Param('nodeId') nodeId: string, @Body() dto: CreateTaskFromNodeDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.createTaskFromNode(nodeId, dto, req.user);
  }

  @Post('canvas/nodes/:nodeId/link-task')
  linkTask(@Param('nodeId') nodeId: string, @Body() dto: LinkTaskDto, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.linkTask(nodeId, dto, req.user);
  }

  @Delete('canvas/nodes/:nodeId/task')
  unlinkTask(@Param('nodeId') nodeId: string, @Req() req: any): Promise<CanvasNodeDto> {
    return this.canvas.unlinkTask(nodeId, req.user);
  }
}
