import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { ProjectDto } from '@moongatracker/shared-types';

export const listProjectsTool: Tool = {
  name: 'list_projects',
  description:
    'List the projects (workspaces) this token can access. Takes no arguments — the entry point for discovery: call it first to get a projectId, then list_boards.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function listProjects(): Promise<string> {
  const projects = await apiGet<ProjectDto[]>('/api/projects');
  return JSON.stringify(projects, null, 2);
}
