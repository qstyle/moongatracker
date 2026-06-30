import { apiFetch, asJson } from './client';
import type { BoardDto, BoardSummaryDto } from '@moongatracker/shared-types';

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
): Promise<BoardSummaryDto> {
  return apiFetch(`/api/projects/${projectId}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
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

export function fetchBoardActors(boardId: string): Promise<unknown[]> {
  return apiFetch(`/api/boards/${boardId}/actors`).then((r) =>
    asJson<unknown[]>(r),
  );
}
