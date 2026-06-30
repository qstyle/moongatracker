import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { BoardDto } from '@moongatracker/shared-types';

export const listBoardsTool: Tool = {
  name: 'list_boards',
  description: 'Список досок с колонками и карточками',
  inputSchema: { type: 'object', properties: {}, required: [] },
};

export async function listBoards(): Promise<string> {
  const boards = await apiGet<BoardDto[]>('/api/boards');
  return JSON.stringify(boards, null, 2);
}
