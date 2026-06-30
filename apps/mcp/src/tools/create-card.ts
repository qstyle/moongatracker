import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPost } from '../api-client.js';
import type { CardDto } from '@moongatracker/shared-types';

export const createCardTool: Tool = {
  name: 'create_card',
  description: 'Create a new card in a project column',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      columnId: { type: 'string' },
      title: { type: 'string', maxLength: 200 },
      body: { type: 'string', maxLength: 2000 },
      priority: { type: 'string', enum: ['urgent', 'normal', 'low'] },
    },
    required: ['projectId', 'columnId', 'title'],
  },
};

export async function createCard(args: {
  projectId: string;
  columnId: string;
  title: string;
  body?: string;
  priority?: 'urgent' | 'normal' | 'low';
}): Promise<string> {
  const card = await apiPost<CardDto>('/api/cards', {
    projectId: args.projectId,
    columnId: args.columnId,
    title: args.title,
    body: args.body,
    priority: args.priority,
  });
  return JSON.stringify(card, null, 2);
}
