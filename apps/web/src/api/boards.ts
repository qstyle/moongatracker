import { BoardDto } from '@moongatracker/shared-types';

export async function fetchBoards(): Promise<BoardDto[]> {
  const res = await fetch('/api/boards');
  if (!res.ok) throw new Error(`fetchBoards failed: ${res.status}`);
  return res.json();
}
