import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPatch } from '../api-client.js';
import type { CardDto } from '@moonga-studio/shared-types';

export const assignCardTool: Tool = {
  name: 'assign_card',
  description:
    'Claim a card for yourself ("me") or clear its assignee ("none"). To assign to a specific user/agent, use update_card with assigneeType + assigneeId.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Card ID' },
      target: {
        type: 'string',
        enum: ['me', 'none'],
        description: '"me" to self-assign, "none" to unassign',
      },
    },
    required: ['cardId', 'target'],
  },
};

export async function assignCard(args: {
  cardId: string;
  target: 'me' | 'none';
}): Promise<string> {
  const body =
    args.target === 'me'
      ? { assigneeId: 'me' }
      : { assigneeType: null, assigneeId: null };
  const card = await apiPatch<CardDto>(`/api/cards/${args.cardId}`, body);
  return JSON.stringify(card, null, 2);
}
