import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { BoardDto, CardDto, ColumnKey } from '@moongatracker/shared-types';

export const listCardsTool: Tool = {
  name: 'list_cards',
  description: 'Карточки доски с опциональным фильтром по колонке',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: { type: 'string', description: 'ID доски' },
      columnKey: {
        type: 'string',
        enum: ['idea', 'triage', 'backlog', 'in_dev', 'done'],
        description: 'Фильтр по колонке (опционально)',
      },
    },
    required: ['boardId'],
  },
};

export async function listCards(args: {
  boardId: string;
  columnKey?: ColumnKey;
}): Promise<string> {
  const boards = await apiGet<BoardDto[]>('/api/boards');
  const board = boards.find((b) => b.id === args.boardId);
  if (!board)
    return JSON.stringify({ error: `Board ${args.boardId} not found` });

  const cards: CardDto[] = board.columns.flatMap((c) => c.cards);
  const filtered = args.columnKey
    ? cards.filter((c) => c.columnKey === args.columnKey)
    : cards;

  return JSON.stringify(filtered, null, 2);
}
