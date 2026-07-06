import { apiFetch, asJson } from './client';
import type {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moonga-studio/shared-types';

// Tokens are user-scoped: one token grants access to all of the owner's projects.
export function fetchTokens(): Promise<ApiTokenDto[]> {
  return apiFetch(`/api/api-tokens`).then((r) => asJson<ApiTokenDto[]>(r));
}

export function createToken(
  name: string,
  scopes: string[],
): Promise<CreateApiTokenResponse> {
  return apiFetch(`/api/api-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, scopes }),
  }).then((r) => asJson<CreateApiTokenResponse>(r));
}

export function revokeToken(id: string): Promise<void> {
  return apiFetch(`/api/api-tokens/${id}`, {
    method: 'DELETE',
  }).then((r) => asJson<void>(r));
}
