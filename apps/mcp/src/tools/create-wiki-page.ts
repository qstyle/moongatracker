import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPost } from '../api-client.js';
import type { WikiPageDto } from '@moongatracker/shared-types';

export const createWikiPageTool: Tool = {
  name: 'create_wiki_page',
  description: 'Создать страницу вики в разделе проекта (markdown)',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      sectionId: { type: 'string' },
      title: { type: 'string', maxLength: 200 },
      body: { type: 'string' },
    },
    required: ['projectId', 'sectionId', 'title'],
  },
};

export async function createWikiPage(args: {
  projectId: string;
  sectionId: string;
  title: string;
  body?: string;
}): Promise<string> {
  const page = await apiPost<WikiPageDto>(
    `/api/projects/${args.projectId}/wiki/pages`,
    { sectionId: args.sectionId, title: args.title, body: args.body },
  );
  return JSON.stringify(page, null, 2);
}
