export interface WikiPageSummaryDto {
  id: string;
  sectionId: string;
  title: string;
  order: number;
  authorType: 'user' | 'agent';
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WikiPageDto extends WikiPageSummaryDto {
  body: string; // markdown
}

export interface WikiSectionDto {
  id: string;
  projectId: string;
  title: string;
  order: number;
  pages: WikiPageSummaryDto[];
}

/** Полное дерево вики проекта: разделы с вложенными страницами (без body). */
export type WikiTreeDto = WikiSectionDto[];

export interface CreateWikiSectionInput {
  title: string;
}

export interface UpdateWikiSectionInput {
  title?: string;
  order?: number;
}

export interface CreateWikiPageInput {
  sectionId: string;
  title: string;
  body?: string;
}

export interface UpdateWikiPageInput {
  title?: string;
  body?: string;
  sectionId?: string;
  order?: number;
}
