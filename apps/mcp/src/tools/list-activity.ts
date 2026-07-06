import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { ActivityDto } from '@moonga-studio/shared-types';

export const listActivityTool: Tool = {
  name: 'list_activity',
  description: 'List activity history for a card (agent actions only)',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Card ID' },
    },
    required: ['cardId'],
  },
};

export async function listActivity(args: { cardId: string }): Promise<string> {
  const activities = await apiGet<ActivityDto[]>(
    `/api/cards/${args.cardId}/activity`,
  );
  return JSON.stringify(activities, null, 2);
}
