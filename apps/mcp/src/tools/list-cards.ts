import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { ProjectDto, CardDto } from '@moongatracker/shared-types';

export const listCardsTool: Tool = {
  name: 'list_cards',
  description: 'List cards in a project, optionally filtered by column',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      columnId: {
        type: 'string',
        description: 'Filter by column ID (optional)',
      },
    },
    required: ['projectId'],
  },
};

export async function listCards(args: {
  projectId: string;
  columnId?: string;
}): Promise<string> {
  const project = await apiGet<ProjectDto>(`/api/projects/${args.projectId}`);
  const cards: CardDto[] = project.columns.flatMap((c) => c.cards);
  const filtered = args.columnId
    ? cards.filter((c) => c.columnId === args.columnId)
    : cards;
  return JSON.stringify(filtered, null, 2);
}
