import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { ProjectSummaryDto } from '@moongatracker/shared-types';

export const listProjectsTool: Tool = {
  name: 'list_projects',
  description: 'List all projects in an organization',
  inputSchema: {
    type: 'object',
    properties: {
      orgId: { type: 'string', description: 'Organization ID' },
    },
    required: ['orgId'],
  },
};

export async function listProjects(args: { orgId: string }): Promise<string> {
  const projects = await apiGet<ProjectSummaryDto[]>(
    `/api/orgs/${args.orgId}/projects`,
  );
  return JSON.stringify(projects, null, 2);
}
