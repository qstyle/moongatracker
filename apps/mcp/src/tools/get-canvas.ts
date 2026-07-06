import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CanvasDoc } from '@moonga-studio/shared-types';

export const getCanvasTool: Tool = {
  name: 'get_canvas',
  description: 'Холст проекта: JSON-документ с нодами (markdown + связанная карточка) и связями',
  inputSchema: {
    type: 'object',
    properties: { projectId: { type: 'string' } },
    required: ['projectId'],
  },
};

export async function getCanvas(args: { projectId: string }): Promise<string> {
  const doc = await apiGet<CanvasDoc>(`/api/projects/${args.projectId}/canvas`);
  return JSON.stringify(doc, null, 2);
}
