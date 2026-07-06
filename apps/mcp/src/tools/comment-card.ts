import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPost } from '../api-client.js';
import type { CommentDto } from '@moonga-studio/shared-types';

export const commentCardTool: Tool = {
  name: 'comment_card',
  description: 'Add a comment to a card',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Card ID' },
      body: { type: 'string', description: 'Comment text', maxLength: 4000 },
    },
    required: ['cardId', 'body'],
  },
};

export async function commentCard(args: {
  cardId: string;
  body: string;
}): Promise<string> {
  const comment = await apiPost<CommentDto>(
    `/api/cards/${args.cardId}/comments`,
    { body: args.body },
  );
  return JSON.stringify(comment, null, 2);
}
