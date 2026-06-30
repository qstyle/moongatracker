import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import {
  ActorDto,
  ProjectDto,
  ProjectSummaryDto,
} from '@moongatracker/shared-types';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('orgs/:orgId/projects')
  listForOrg(
    @Param('orgId') orgId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<ProjectSummaryDto[]> {
    return this.projects.listForOrg(orgId, req.user.sub);
  }

  @Post('orgs/:orgId/projects')
  create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateProjectDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ProjectSummaryDto> {
    return this.projects.create(orgId, dto.name, req.user.sub);
  }

  @Get('projects/:projectId')
  getWithColumns(
    @Param('projectId') projectId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<ProjectDto> {
    return this.projects.getWithColumns(projectId, req.user.sub);
  }

  @Patch('projects/:projectId')
  update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ProjectSummaryDto> {
    return this.projects.update(projectId, req.user.sub, dto.name!);
  }

  @Get('projects/:projectId/actors')
  getActors(
    @Param('projectId') projectId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<ActorDto[]> {
    return this.projects.getActors(projectId, req.user.sub);
  }
}
