import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { WikiTreeDto } from '@moongatracker/shared-types';

export const listWikiTool: Tool = {
  name: 'list_wiki',
  description: 'Дерево вики проекта: разделы со списком страниц (без текста)',
  inputSchema: {
    type: 'object',
    properties: { projectId: { type: 'string' } },
    required: ['projectId'],
  },
};

export async function listWiki(args: { projectId: string }): Promise<string> {
  const tree = await apiGet<WikiTreeDto>(
    `/api/projects/${args.projectId}/wiki`,
  );
  return JSON.stringify(tree, null, 2);
}
