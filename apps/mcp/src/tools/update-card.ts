import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPatch } from '../api-client.js';
import type { CardDto } from '@moongatracker/shared-types';

export const updateCardTool: Tool = {
  name: 'update_card',
  description: 'Update card title, body, priority, or column',
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
}): Promise<string> {
  const { cardId, ...updates } = args;
  const card = await apiPatch<CardDto>(`/api/cards/${cardId}`, updates);
  return JSON.stringify(card, null, 2);
}
