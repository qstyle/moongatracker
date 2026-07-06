import { AuthResponse } from '@moonga-studio/shared-types';
import { apiFetch, asJson, setToken } from './client';

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await asJson<AuthResponse>(res);
  setToken(data.accessToken);
  return data;
}

export function logout(): void {
  setToken(null);
}

export async function register(
  email: string,
  password: string,
): Promise<void> {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await asJson<{ accessToken: string }>(res);
  setToken(data.accessToken);
}
