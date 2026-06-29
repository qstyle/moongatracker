import { CommentDto } from '@moongatracker/shared-types';
import { apiFetch, asJson } from './client';

export function listComments(cardId: string): Promise<CommentDto[]> {
  return apiFetch(`/api/cards/${cardId}/comments`).then((r) =>
    asJson<CommentDto[]>(r),
  );
}

export function addComment(cardId: string, body: string): Promise<CommentDto> {
  return apiFetch(`/api/cards/${cardId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  }).then((r) => asJson<CommentDto>(r));
}
