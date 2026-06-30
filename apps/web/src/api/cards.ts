import {
  CardDto,
  CreateCardInput,
  UpdateCardInput,
} from '@moongatracker/shared-types';
import { apiFetch, asJson } from './client';

export function fetchCard(id: string): Promise<CardDto> {
  return apiFetch(`/api/cards/${id}`).then((r) => asJson<CardDto>(r));
}

export function createCard(input: CreateCardInput): Promise<CardDto> {
  return apiFetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => asJson<CardDto>(r));
}

export function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<CardDto> {
  return apiFetch(`/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => asJson<CardDto>(r));
}

export async function deleteCard(id: string): Promise<void> {
  const res = await apiFetch(`/api/cards/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`${res.status}`);
}
