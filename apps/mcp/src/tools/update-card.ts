import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPatch } from '../api-client.js';
import type { CardDto } from '@moonga-studio/shared-types';

export const updateCardTool: Tool = {
  name: 'update_card',
  description:
    'Update card title, body, priority, column, or assignee. To assign to a user/agent set assigneeType + assigneeId (ids come from get_card/list_cards actors). Use assigneeId "me" to self-assign; to claim/unassign prefer assign_card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Card ID' },
      title: {
        type: 'string',
        description: 'New title (optional)',
        maxLength: 200,
      },
      body: { type: 'string', description: 'New body/description (optional)' },
      priority: {
        type: 'string',
        enum: ['urgent', 'normal', 'low'],
        description: 'Priority (optional)',
      },
      columnId: { type: 'string', description: 'Move to column ID (optional)' },
      assigneeType: {
        type: 'string',
        enum: ['user', 'agent'],
        description: 'Assignee kind (optional; pair with assigneeId)',
      },
      assigneeId: {
        type: 'string',
        description: 'Assignee id, or "me" to self-assign (optional)',
      },
    },
    required: ['cardId'],
  },
};

export async function updateCard(args: {
  cardId: string;
  title?: string;
  body?: string;
  priority?: 'urgent' | 'normal' | 'low';
  columnId?: string;
  assigneeType?: 'user' | 'agent';
  assigneeId?: string;
}): Promise<string> {
  const { cardId, ...updates } = args;
  const card = await apiPatch<CardDto>(`/api/cards/${cardId}`, updates);
  return JSON.stringify(card, null, 2);
}
