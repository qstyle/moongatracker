import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertMembership, PrismaService } from '@moongatracker/data-access';
import {
  WikiPageDto,
  WikiPageSummaryDto,
  WikiSectionDto,
  WikiTreeDto,
} from '@moongatracker/shared-types';
import { CreateWikiSectionDto } from './dto/create-wiki-section.dto';
import { UpdateWikiSectionDto } from './dto/update-wiki-section.dto';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';
import { buildStarterWiki } from './starter-wiki';

type WikiPageRow = {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  order: number;
  authorType: string;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSummaryDto(page: WikiPageRow): WikiPageSummaryDto {
  return {
    id: page.id,
    sectionId: page.sectionId,
    title: page.title,
    order: page.order,
    authorType: page.authorType === 'agent' ? 'agent' : 'user',
    authorId: page.authorId,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

function toPageDto(page: WikiPageRow): WikiPageDto {
  return { ...toSummaryDto(page), body: page.body };
}

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  /** Доступ к проекту: участник (user) или агент с токеном этого проекта. */
  private async assertAccess(user: any, projectId: string): Promise<void> {
    if (user?.type === 'agent') {
      if (user.projectId !== projectId)
        throw new ForbiddenException('Token is not scoped to this project');
      return;
    }
    await assertMembership(this.prisma, user.sub, projectId);
  }

  private actor(user: any): { authorType: string; authorId: string | null } {
    if (user?.type === 'agent') {
      return { authorType: 'agent', authorId: user.tokenId ?? null };
    }
    return { authorType: 'user', authorId: user?.sub ?? null };
  }

  private async sectionProjectId(sectionId: string): Promise<string> {
    const section = await this.prisma.wikiSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException(`Wiki section ${sectionId} not found`);
    return section.projectId;
  }

  async getTree(projectId: string, user: any): Promise<WikiTreeDto> {
    await this.assertAccess(user, projectId);
    const sections = await this.prisma.wikiSection.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: { pages: { orderBy: { order: 'asc' } } },
    });
    return sections.map(
      (s): WikiSectionDto => ({
        id: s.id,
        projectId: s.projectId,
        title: s.title,
        order: s.order,
        pages: s.pages.map(toSummaryDto),
      }),
    );
  }

  async getPage(pageId: string, user: any): Promise<WikiPageDto> {
    const page = await this.prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: { section: true },
    });
    if (!page) throw new NotFoundException(`Wiki page ${pageId} not found`);
    await this.assertAccess(user, page.section.projectId);
    return toPageDto(page);
  }

  async createSection(
    projectId: string,
    dto: CreateWikiSectionDto,
    user: any,
  ): Promise<WikiSectionDto> {
    await this.assertAccess(user, projectId);
    const max = await this.prisma.wikiSection.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    const section = await this.prisma.wikiSection.create({
      data: { projectId, title: dto.title, order: (max._max.order ?? -1) + 1 },
    });
    return {
      id: section.id,
      projectId: section.projectId,
      title: section.title,
      order: section.order,
      pages: [],
    };
  }

  async updateSection(
    sectionId: string,
    dto: UpdateWikiSectionDto,
    user: any,
  ): Promise<WikiSectionDto> {
    const projectId = await this.sectionProjectId(sectionId);
    await this.assertAccess(user, projectId);
    const section = await this.prisma.wikiSection.update({
      where: { id: sectionId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
      include: { pages: { orderBy: { order: 'asc' } } },
    });
    return {
      id: section.id,
      projectId: section.projectId,
      title: section.title,
      order: section.order,
      pages: section.pages.map(toSummaryDto),
    };
  }

  async removeSection(sectionId: string, user: any): Promise<void> {
    const projectId = await this.sectionProjectId(sectionId);
    await this.assertAccess(user, projectId);
    await this.prisma.wikiSection.delete({ where: { id: sectionId } });
  }

  async createPage(
    projectId: string,
    dto: CreateWikiPageDto,
    user: any,
  ): Promise<WikiPageDto> {
    await this.assertAccess(user, projectId);
    const section = await this.prisma.wikiSection.findUnique({
      where: { id: dto.sectionId },
    });
    if (!section || section.projectId !== projectId)
      throw new BadRequestException('Section does not belong to this project');

    const max = await this.prisma.wikiPage.aggregate({
      where: { sectionId: dto.sectionId },
      _max: { order: true },
    });
    const { authorType, authorId } = this.actor(user);
    const page = await this.prisma.wikiPage.create({
      data: {
        sectionId: dto.sectionId,
        title: dto.title,
        body: dto.body ?? '',
        order: (max._max.order ?? -1) + 1,
        authorType,
        authorId,
      },
    });
    return toPageDto(page);
  }

  async updatePage(
    pageId: string,
    dto: UpdateWikiPageDto,
    user: any,
  ): Promise<WikiPageDto> {
    const existing = await this.prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: { section: true },
    });
    if (!existing) throw new NotFoundException(`Wiki page ${pageId} not found`);
    await this.assertAccess(user, existing.section.projectId);

    if (dto.sectionId !== undefined && dto.sectionId !== existing.sectionId) {
      const target = await this.prisma.wikiSection.findUnique({
        where: { id: dto.sectionId },
      });
      if (!target || target.projectId !== existing.section.projectId)
        throw new BadRequestException('Target section is in another project');
    }

    const { authorType, authorId } = this.actor(user);
    const page = await this.prisma.wikiPage.update({
      where: { id: pageId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.sectionId !== undefined && { sectionId: dto.sectionId }),
        ...(dto.order !== undefined && { order: dto.order }),
        authorType,
        authorId,
      },
    });
    return toPageDto(page);
  }

  async removePage(pageId: string, user: any): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: { section: true },
    });
    if (!page) throw new NotFoundException(`Wiki page ${pageId} not found`);
    await this.assertAccess(user, page.section.projectId);
    await this.prisma.wikiPage.delete({ where: { id: pageId } });
  }

  /** Засев стартового набора. Идемпотентно: только если разделов ещё нет. */
  async seed(projectId: string, user: any): Promise<WikiTreeDto> {
    await this.assertAccess(user, projectId);
    const count = await this.prisma.wikiSection.count({ where: { projectId } });
    if (count === 0) {
      await this.prisma.$transaction((tx) => buildStarterWiki(tx, projectId));
    }
    return this.getTree(projectId, user);
  }
}
