import {
  CardDto,
  CreateCardInput,
  UpdateCardInput,
} from '@moongatracker/shared-types';

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export function createCard(input: CreateCardInput): Promise<CardDto> {
  return fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => asJson<CardDto>(r));
}

export function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<CardDto> {
  return fetch(`/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => asJson<CardDto>(r));
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`${res.status}`);
}
