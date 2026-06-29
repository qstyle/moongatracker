const STORAGE_KEY = 'mgt_token';

let token: string | null =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY)
    : null;

const listeners = new Set<() => void>();

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null): void {
  token = next;
  if (next) localStorage.setItem(STORAGE_KEY, next);
  else localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

export function onAuthChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** fetch wrapper that attaches the bearer token and logs out on 401. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    throw new Error('Не авторизован');
  }
  return res;
}

export async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
