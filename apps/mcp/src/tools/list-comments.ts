import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CommentDto } from '@moonga-studio/shared-types';

export const listCommentsTool: Tool = {
  name: 'list_comments',
  description: 'List the comment thread of a card (oldest first).',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Card ID' },
    },
    required: ['cardId'],
  },
};

export async function listComments(args: { cardId: string }): Promise<string> {
  const comments = await apiGet<CommentDto[]>(
    `/api/cards/${args.cardId}/comments`,
  );
  return JSON.stringify(comments, null, 2);
}
