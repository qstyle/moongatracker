import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPatch } from '../api-client.js';
import type { CardDto } from '@moonga-studio/shared-types';

export const moveCardTool: Tool = {
  name: 'move_card',
  description: 'Move a card to a different column',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Card ID' },
      columnId: { type: 'string', description: 'Target column ID' },
    },
    required: ['cardId', 'columnId'],
  },
};

export async function moveCard(args: {
  cardId: string;
  columnId: string;
}): Promise<string> {
  const card = await apiPatch<CardDto>(`/api/cards/${args.cardId}`, {
    columnId: args.columnId,
  });
  return JSON.stringify(card, null, 2);
}
