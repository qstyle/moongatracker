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
import {
  WikiPageDto,
  WikiSectionDto,
  WikiTreeDto,
} from '@moonga-studio/shared-types';
import { WikiService } from './wiki.service';
import { CreateWikiSectionDto } from './dto/create-wiki-section.dto';
import { UpdateWikiSectionDto } from './dto/update-wiki-section.dto';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';

@Controller()
export class WikiController {
  constructor(private readonly wiki: WikiService) {}

  @Get('projects/:projectId/wiki')
  getTree(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ): Promise<WikiTreeDto> {
    return this.wiki.getTree(projectId, req.user);
  }

  @Post('projects/:projectId/wiki/seed')
  seed(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ): Promise<WikiTreeDto> {
    return this.wiki.seed(projectId, req.user);
  }

  @Post('projects/:projectId/wiki/sections')
  createSection(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWikiSectionDto,
    @Req() req: any,
  ): Promise<WikiSectionDto> {
    return this.wiki.createSection(projectId, dto, req.user);
  }

  @Patch('wiki/sections/:sectionId')
  updateSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateWikiSectionDto,
    @Req() req: any,
  ): Promise<WikiSectionDto> {
    return this.wiki.updateSection(sectionId, dto, req.user);
  }

  @Delete('wiki/sections/:sectionId')
  @HttpCode(204)
  removeSection(
    @Param('sectionId') sectionId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.wiki.removeSection(sectionId, req.user);
  }

  @Post('projects/:projectId/wiki/pages')
  createPage(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWikiPageDto,
    @Req() req: any,
  ): Promise<WikiPageDto> {
    return this.wiki.createPage(projectId, dto, req.user);
  }

  @Get('wiki/pages/:pageId')
  getPage(
    @Param('pageId') pageId: string,
    @Req() req: any,
  ): Promise<WikiPageDto> {
    return this.wiki.getPage(pageId, req.user);
  }

  @Patch('wiki/pages/:pageId')
  updatePage(
    @Param('pageId') pageId: string,
    @Body() dto: UpdateWikiPageDto,
    @Req() req: any,
  ): Promise<WikiPageDto> {
    return this.wiki.updatePage(pageId, dto, req.user);
  }

  @Delete('wiki/pages/:pageId')
  @HttpCode(204)
  removePage(
    @Param('pageId') pageId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.wiki.removePage(pageId, req.user);
  }
}
