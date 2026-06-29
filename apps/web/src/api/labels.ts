import { LabelDto } from '@moongatracker/shared-types';
import { apiFetch, asJson } from './client';

export function listLabels(boardId: string): Promise<LabelDto[]> {
  return apiFetch(`/api/boards/${boardId}/labels`).then((r) =>
    asJson<LabelDto[]>(r),
  );
}

export function createLabel(
  boardId: string,
  name: string,
  color: string,
): Promise<LabelDto> {
  return apiFetch(`/api/boards/${boardId}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  }).then((r) => asJson<LabelDto>(r));
}

export async function attachLabel(
  cardId: string,
  labelId: string,
): Promise<void> {
  const res = await apiFetch(`/api/cards/${cardId}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labelId }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
}

export async function detachLabel(
  cardId: string,
  labelId: string,
): Promise<void> {
  const res = await apiFetch(`/api/cards/${cardId}/labels/${labelId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`${res.status}`);
}
