import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CardDto } from '@moonga-studio/shared-types';

export const listMyCardsTool: Tool = {
  name: 'list_my_cards',
  description:
    'Your inbox: cards assigned to you (this agent) across every board you can access.',
  inputSchema: { type: 'object', properties: {} },
};

export async function listMyCards(): Promise<string> {
  const cards = await apiGet<CardDto[]>('/api/cards/assigned');
  return JSON.stringify(cards, null, 2);
}
