import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPatch } from '../api-client.js';
import type { CardDto, ColumnKey } from '@moongatracker/shared-types';

export const moveCardTool: Tool = {
  name: 'move_card',
  description:
    'Переместить карточку в другую колонку (idea→triage→backlog→in_dev→done)',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string' },
      columnKey: {
        type: 'string',
        enum: ['idea', 'triage', 'backlog', 'in_dev', 'done'],
      },
    },
    required: ['cardId', 'columnKey'],
  },
};

export async function moveCard(args: {
  cardId: string;
  columnKey: ColumnKey;
}): Promise<string> {
  const card = await apiPatch<CardDto>(`/api/cards/${args.cardId}`, {
    columnKey: args.columnKey,
  });
  return JSON.stringify(card, null, 2);
}
