import { apiFetch, asJson } from './client';
import type { MeResponse } from '@moonga-studio/shared-types';

export function fetchMe(): Promise<MeResponse> {
  return apiFetch('/api/auth/me').then((r) => asJson<MeResponse>(r));
}

export function updateMyName(name: string): Promise<MeResponse> {
  return apiFetch('/api/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<MeResponse>(r));
}
