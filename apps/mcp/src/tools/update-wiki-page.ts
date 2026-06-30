import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPatch } from '../api-client.js';
import type { WikiPageDto } from '@moongatracker/shared-types';

export const updateWikiPageTool: Tool = {
  name: 'update_wiki_page',
  description: 'Обновить заголовок и/или markdown-текст страницы вики',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: { type: 'string' },
      title: { type: 'string', maxLength: 200 },
      body: { type: 'string' },
    },
    required: ['pageId'],
  },
};

export async function updateWikiPage(args: {
  pageId: string;
  title?: string;
  body?: string;
}): Promise<string> {
  const page = await apiPatch<WikiPageDto>(`/api/wiki/pages/${args.pageId}`, {
    title: args.title,
    body: args.body,
  });
  return JSON.stringify(page, null, 2);
}
