import { apiFetch, asJson } from './client';
import type { CanvasDoc, LinkedCardDto } from '@moongatracker/shared-types';

const json = { 'Content-Type': 'application/json' };

export function fetchCanvas(projectId: string): Promise<CanvasDoc> {
  return apiFetch(`/api/projects/${projectId}/canvas`).then((r) => asJson<CanvasDoc>(r));
}

export async function saveCanvas(projectId: string, doc: CanvasDoc): Promise<void> {
  const r = await apiFetch(`/api/projects/${projectId}/canvas`, {
    method: 'PUT',
    headers: json,
    body: JSON.stringify(doc),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function createTaskFromNode(
  projectId: string,
  nodeId: string,
  boardId: string,
): Promise<{ cardId: string; card: LinkedCardDto }> {
  return apiFetch(
    `/api/projects/${projectId}/canvas/nodes/${nodeId}/create-task`,
    { method: 'POST', headers: json, body: JSON.stringify({ boardId }) },
  ).then((r) => asJson<{ cardId: string; card: LinkedCardDto }>(r));
}
