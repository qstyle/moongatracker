import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CardDto } from '@moongatracker/shared-types';

export const getCardTool: Tool = {
  name: 'get_card',
  description: 'Детали карточки по ID',
  inputSchema: {
    type: 'object',
    properties: { cardId: { type: 'string' } },
    required: ['cardId'],
  },
};

export async function getCard(args: { cardId: string }): Promise<string> {
  const card = await apiGet<CardDto>(`/api/cards/${args.cardId}`);
  return JSON.stringify(card, null, 2);
}
