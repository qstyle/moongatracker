import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { WikiPageDto } from '@moonga-studio/shared-types';

export const getWikiPageTool: Tool = {
  name: 'get_wiki_page',
  description: 'Страница вики по ID (с markdown-текстом)',
  inputSchema: {
    type: 'object',
    properties: { pageId: { type: 'string' } },
    required: ['pageId'],
  },
};

export async function getWikiPage(args: { pageId: string }): Promise<string> {
  const page = await apiGet<WikiPageDto>(`/api/wiki/pages/${args.pageId}`);
  return JSON.stringify(page, null, 2);
}
