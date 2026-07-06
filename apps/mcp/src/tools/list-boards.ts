import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { BoardSummaryDto } from '@moonga-studio/shared-types';

export const listBoardsTool: Tool = {
  name: 'list_boards',
  description: 'List the boards of a project (workspace)',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project (workspace) ID' },
    },
    required: ['projectId'],
  },
};

export async function listBoards(args: { projectId: string }): Promise<string> {
  const boards = await apiGet<BoardSummaryDto[]>(
    `/api/projects/${args.projectId}/boards`,
  );
  return JSON.stringify(boards, null, 2);
}
