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
  Request,
} from '@nestjs/common';
import { MemberDto, ProjectDto } from '@moongatracker/shared-types';
import { RequestActor } from '@moongatracker/data-access';
import { ProjectsService } from './projects.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateMemberColorDto } from './dto/update-member-color.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  listForUser(
    @Request() req: { user: RequestActor },
  ): Promise<ProjectDto[]> {
    return this.projects.listForActor(req.user);
  }

  @Post()
  create(
    @Body() dto: CreateProjectDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ProjectDto> {
    return this.projects.create(dto.name, req.user.sub);
  }

  @Patch(':projectId')
  update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ProjectDto> {
    return this.projects.update(projectId, req.user.sub, dto.name!);
  }

  @Get(':projectId/members')
  getMembers(
    @Param('projectId') projectId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<MemberDto[]> {
    return this.projects.getMembers(projectId, req.user.sub);
  }

  @Post(':projectId/members')
  addMember(
    @Param('projectId') projectId: string,
    @Body() dto: AddMemberDto,
    @Req() req: any,
  ): Promise<MemberDto> {
    return this.projects.addMember(projectId, dto.email, req.user.sub);
  }

  @Delete(':projectId')
  @HttpCode(204)
  deleteProject(
    @Param('projectId') projectId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.projects.delete(projectId, req.user.sub);
  }

  @Patch(':projectId/members/:userId/color')
  updateMemberColor(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberColorDto,
    @Req() req: any,
  ): Promise<MemberDto> {
    return this.projects.updateMemberColor(
      projectId,
      userId,
      dto.color,
      req.user.sub,
    );
  }

  @Delete(':projectId/members/:userId')
  @HttpCode(204)
  removeMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.projects.removeMember(projectId, userId, req.user.sub);
  }
}
