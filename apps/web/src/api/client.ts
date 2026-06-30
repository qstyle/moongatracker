const STORAGE_KEY = 'mgt_token';

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' &&
      typeof localStorage.getItem === 'function'
      ? localStorage
      : null;
  } catch {
    return null;
  }
}

let token: string | null = safeLocalStorage()?.getItem(STORAGE_KEY) ?? null;

const listeners = new Set<() => void>();

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null): void {
  token = next;
  const ls = safeLocalStorage();
  if (next) ls?.setItem(STORAGE_KEY, next);
  else ls?.removeItem(STORAGE_KEY);
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
