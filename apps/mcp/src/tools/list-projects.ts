import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { BoardSummaryDto } from '@moongatracker/shared-types';

export const listProjectsTool: Tool = {
  name: 'list_projects',
  description: 'List all boards in a project (workspace)',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project (workspace) ID' },
    },
    required: ['projectId'],
  },
};

export async function listProjects(args: {
  projectId: string;
}): Promise<string> {
  const boards = await apiGet<BoardSummaryDto[]>(
    `/api/projects/${args.projectId}/boards`,
  );
  return JSON.stringify(boards, null, 2);
}
