export const USERNAME_RE = /^[a-z0-9_.-]+$/;
export const USERNAME_MESSAGE = 'username may contain only a-z, 0-9, and _ . -';

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}
