import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { BoardDto, CardDto } from '@moongatracker/shared-types';

export const listCardsTool: Tool = {
  name: 'list_cards',
  description: 'List cards in a board, optionally filtered by column',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: { type: 'string', description: 'Board ID' },
      columnId: {
        type: 'string',
        description: 'Filter by column ID (optional)',
      },
    },
    required: ['boardId'],
  },
};

export async function listCards(args: {
  boardId: string;
  columnId?: string;
}): Promise<string> {
  const board = await apiGet<BoardDto>(`/api/boards/${args.boardId}`);
  const cards: CardDto[] = board.columns.flatMap((c) => c.cards);
  const filtered = args.columnId
    ? cards.filter((c) => c.columnId === args.columnId)
    : cards;
  return JSON.stringify(filtered, null, 2);
}
