import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPost } from '../api-client.js';
import type { WikiSectionDto } from '@moonga-studio/shared-types';

export const createWikiSectionTool: Tool = {
  name: 'create_wiki_section',
  description:
    'Создать раздел вики в проекте. Возвращает раздел с его id (sectionId) — используй его в create_wiki_page.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      title: { type: 'string', maxLength: 120 },
    },
    required: ['projectId', 'title'],
  },
};

export async function createWikiSection(args: {
  projectId: string;
  title: string;
}): Promise<string> {
  const section = await apiPost<WikiSectionDto>(
    `/api/projects/${args.projectId}/wiki/sections`,
    { title: args.title },
  );
  return JSON.stringify(section, null, 2);
}
