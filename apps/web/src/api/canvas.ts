import { apiFetch, asJson } from './client';
import type {
  CanvasDto,
  CanvasNodeDto,
  CanvasEdgeDto,
} from '@moongatracker/shared-types';

const json = { 'Content-Type': 'application/json' };

export function fetchCanvas(projectId: string): Promise<CanvasDto> {
  return apiFetch(`/api/projects/${projectId}/canvas`).then((r) => asJson<CanvasDto>(r));
}

export function seedCanvas(projectId: string): Promise<CanvasDto> {
  return apiFetch(`/api/projects/${projectId}/canvas/seed`, { method: 'POST' }).then((r) => asJson<CanvasDto>(r));
}

export function createNode(projectId: string, input: { text?: string; x: number; y: number }): Promise<CanvasNodeDto> {
  return apiFetch(`/api/projects/${projectId}/canvas/nodes`, {
    method: 'POST', headers: json, body: JSON.stringify(input),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export function updateNode(
  nodeId: string,
  patch: { text?: string; x?: number; y?: number; width?: number; height?: number; color?: string | null },
): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}`, {
    method: 'PATCH', headers: json, body: JSON.stringify(patch),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export async function deleteNode(nodeId: string): Promise<void> {
  const r = await apiFetch(`/api/canvas/nodes/${nodeId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function createEdge(projectId: string, input: { sourceNodeId: string; targetNodeId: string; label?: string | null }): Promise<CanvasEdgeDto> {
  return apiFetch(`/api/projects/${projectId}/canvas/edges`, {
    method: 'POST', headers: json, body: JSON.stringify(input),
  }).then((r) => asJson<CanvasEdgeDto>(r));
}

export async function deleteEdge(edgeId: string): Promise<void> {
  const r = await apiFetch(`/api/canvas/edges/${edgeId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function createTaskFromNode(nodeId: string, boardId: string): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}/create-task`, {
    method: 'POST', headers: json, body: JSON.stringify({ boardId }),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export function linkTask(nodeId: string, cardId: string): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}/link-task`, {
    method: 'POST', headers: json, body: JSON.stringify({ cardId }),
  }).then((r) => asJson<CanvasNodeDto>(r));
}

export function unlinkTask(nodeId: string): Promise<CanvasNodeDto> {
  return apiFetch(`/api/canvas/nodes/${nodeId}/task`, { method: 'DELETE' }).then((r) => asJson<CanvasNodeDto>(r));
}
