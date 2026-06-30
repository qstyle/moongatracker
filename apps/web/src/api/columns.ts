import { apiFetch, asJson } from './client';
import type { ColumnDto } from '@moongatracker/shared-types';

export function createColumn(
  boardId: string,
  title: string,
): Promise<ColumnDto> {
  return apiFetch('/api/columns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, title }),
  }).then((r) => asJson<ColumnDto>(r));
}

export function updateColumn(
  id: string,
  data: { title?: string; order?: number },
): Promise<ColumnDto> {
  return apiFetch(`/api/columns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => asJson<ColumnDto>(r));
}

export function reorderColumns(
  boardId: string,
  orderedIds: string[],
): Promise<void> {
  return apiFetch('/api/columns/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, orderedIds }),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`${r.status}`);
  });
}

export function deleteColumn(id: string): Promise<void> {
  return apiFetch(`/api/columns/${id}`, { method: 'DELETE' }).then(
    async (r) => {
      if (!r.ok) throw new Error(`${r.status}`);
    },
  );
}
