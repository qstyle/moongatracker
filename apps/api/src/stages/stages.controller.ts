import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { StageDto } from '@moonga-studio/shared-types';
import { StagesService } from './stages.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

@Controller()
export class StagesController {
  constructor(private readonly stages: StagesService) {}

  @Get('projects/:projectId/stages')
  list(
    @Param('projectId') projectId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<StageDto[]> {
    return this.stages.listForProject(projectId, req.user.sub);
  }

  @Post('projects/:projectId/stages')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateStageDto,
    @Request() req: { user: { sub: string } },
  ): Promise<StageDto> {
    return this.stages.create(projectId, dto.title, req.user.sub);
  }

  @Post('projects/:projectId/stages/seed-defaults')
  seed(
    @Param('projectId') projectId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<StageDto[]> {
    return this.stages.seedDefaults(projectId, req.user.sub);
  }

  // Declared before ':id' so "reorder" is not captured as a stage id.
  @Patch('stages/reorder')
  reorder(
    @Body() dto: ReorderStagesDto,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.stages.reorder(dto.projectId, dto.orderedIds, req.user.sub);
  }

  @Patch('stages/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStageDto,
    @Request() req: { user: { sub: string } },
  ): Promise<StageDto> {
    return this.stages.update(id, req.user.sub, dto);
  }

  @Delete('stages/:id')
  @HttpCode(204)
  remove(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.stages.remove(id, req.user.sub);
  }

  @Post('projects/:projectId/stages/:stageId/scaffold')
  scaffold(
    @Param('projectId') projectId: string,
    @Param('stageId') stageId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<{ boardId: string }> {
    return this.stages.scaffold(projectId, stageId, req.user.sub);
  }
}
