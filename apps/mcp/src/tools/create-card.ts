import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPost } from '../api-client.js';
import type { CardDto } from '@moongatracker/shared-types';

export const createCardTool: Tool = {
  name: 'create_card',
  description: 'Создать карточку. По умолчанию попадает в колонку idea.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: { type: 'string' },
      title: { type: 'string', maxLength: 200 },
      body: { type: 'string', maxLength: 2000 },
      columnKey: {
        type: 'string',
        enum: ['idea', 'triage', 'backlog', 'in_dev', 'done'],
        default: 'idea',
      },
    },
    required: ['boardId', 'title'],
  },
};

export async function createCard(args: {
  boardId: string;
  title: string;
  body?: string;
  columnKey?: string;
}): Promise<string> {
  const card = await apiPost<CardDto>('/api/cards', {
    boardId: args.boardId,
    title: args.title,
    body: args.body ?? null,
    columnKey: args.columnKey ?? 'idea',
  });
  return JSON.stringify(card, null, 2);
}
