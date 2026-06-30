import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CanvasDto } from '@moongatracker/shared-types';

export const getCanvasTool: Tool = {
  name: 'get_canvas',
  description: 'Холст проекта: ноды (markdown + позиция + связанная карточка) и связи между ними',
  inputSchema: {
    type: 'object',
    properties: { projectId: { type: 'string' } },
    required: ['projectId'],
  },
};

export async function getCanvas(args: { projectId: string }): Promise<string> {
  const canvas = await apiGet<CanvasDto>(`/api/projects/${args.projectId}/canvas`);
  return JSON.stringify(canvas, null, 2);
}
