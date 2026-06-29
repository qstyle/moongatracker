import { CommentDto } from '@moongatracker/shared-types';

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export function listComments(cardId: string): Promise<CommentDto[]> {
  return fetch(`/api/cards/${cardId}/comments`).then((r) =>
    asJson<CommentDto[]>(r),
  );
}

export function addComment(cardId: string, body: string): Promise<CommentDto> {
  return fetch(`/api/cards/${cardId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  }).then((r) => asJson<CommentDto>(r));
}
