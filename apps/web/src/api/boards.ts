import { apiFetch, asJson } from './client';
import type {
  ActorDto,
  BoardDto,
  BoardSummaryDto,
} from '@moonga-studio/shared-types';

export function fetchBoards(projectId: string): Promise<BoardSummaryDto[]> {
  return apiFetch(`/api/projects/${projectId}/boards`).then((r) =>
    asJson<BoardSummaryDto[]>(r),
  );
}

export function fetchBoard(boardId: string): Promise<BoardDto> {
  return apiFetch(`/api/boards/${boardId}`).then((r) => asJson<BoardDto>(r));
}

export function createBoard(
  projectId: string,
  name: string,
  stageId?: string,
): Promise<BoardSummaryDto> {
  return apiFetch(`/api/projects/${projectId}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stageId ? { name, stageId } : { name }),
  }).then((r) => asJson<BoardSummaryDto>(r));
}

export function updateBoard(
  boardId: string,
  name: string,
): Promise<BoardSummaryDto> {
  return apiFetch(`/api/boards/${boardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<BoardSummaryDto>(r));
}

export async function deleteBoard(boardId: string): Promise<void> {
  const r = await apiFetch(`/api/boards/${boardId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function fetchBoardActors(boardId: string): Promise<ActorDto[]> {
  return apiFetch(`/api/boards/${boardId}/actors`).then((r) =>
    asJson<ActorDto[]>(r),
  );
}
