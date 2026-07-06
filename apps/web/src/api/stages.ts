import { apiFetch, asJson } from './client';
import type { StageDto } from '@moongatracker/shared-types';

export function fetchStages(projectId: string): Promise<StageDto[]> {
  return apiFetch(`/api/projects/${projectId}/stages`).then((r) =>
    asJson<StageDto[]>(r),
  );
}

export function seedDefaultStages(projectId: string): Promise<StageDto[]> {
  return apiFetch(`/api/projects/${projectId}/stages/seed-defaults`, {
    method: 'POST',
  }).then((r) => asJson<StageDto[]>(r));
}

export function createStage(projectId: string, title: string): Promise<StageDto> {
  return apiFetch(`/api/projects/${projectId}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  }).then((r) => asJson<StageDto>(r));
}

export function updateStage(
  stageId: string,
  patch: { title?: string; status?: string },
): Promise<StageDto> {
  return apiFetch(`/api/stages/${stageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => asJson<StageDto>(r));
}

export async function deleteStage(stageId: string): Promise<void> {
  const r = await apiFetch(`/api/stages/${stageId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}
