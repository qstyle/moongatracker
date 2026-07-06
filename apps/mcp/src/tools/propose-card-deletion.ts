import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiPost } from '../api-client.js';
import type { ProposalDto } from '@moonga-studio/shared-types';

export const proposeCardDeletionTool: Tool = {
  name: 'propose_card_deletion',
  description:
    'Request deletion of a card. Agents cannot delete directly — this creates a pending proposal the project owner approves or rejects (in-app or via Telegram). Returns the proposal.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Card ID to delete' },
      reason: {
        type: 'string',
        description: 'Why the card should be deleted (optional)',
        maxLength: 500,
      },
    },
    required: ['cardId'],
  },
};

export async function proposeCardDeletion(args: {
  cardId: string;
  reason?: string;
}): Promise<string> {
  const proposal = await apiPost<ProposalDto>(
    `/api/cards/${args.cardId}/deletion-proposal`,
    { reason: args.reason },
  );
  return JSON.stringify(proposal, null, 2);
}
