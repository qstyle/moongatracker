import { BoardDto } from '@moongatracker/shared-types';
import { apiFetch, asJson } from './client';

export async function fetchBoards(): Promise<BoardDto[]> {
  const res = await apiFetch('/api/boards');
  return asJson<BoardDto[]>(res);
}
