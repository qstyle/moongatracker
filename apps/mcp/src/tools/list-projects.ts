import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { ProjectDto } from '@moonga-studio/shared-types';

export const listProjectsTool: Tool = {
  name: 'list_projects',
  description:
    'List the projects (ventures) this token can access. Takes no arguments — the entry point for discovery: call it first to get a projectId, then list_boards. New here? Call get_started first for your role and the studio workflow.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function listProjects(): Promise<string> {
  const projects = await apiGet<ProjectDto[]>('/api/projects');
  return JSON.stringify(projects, null, 2);
}
