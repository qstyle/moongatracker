import { apiFetch, asJson } from './client';
import type {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';

export function fetchTokens(orgId: string): Promise<ApiTokenDto[]> {
  return apiFetch(`/api/orgs/${orgId}/api-tokens`).then((r) =>
    asJson<ApiTokenDto[]>(r),
  );
}

export function createToken(
  orgId: string,
  name: string,
  scopes: string[],
): Promise<CreateApiTokenResponse> {
  return apiFetch(`/api/orgs/${orgId}/api-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, scopes }),
  }).then((r) => asJson<CreateApiTokenResponse>(r));
}

export function revokeToken(orgId: string, id: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/api-tokens/${id}`, {
    method: 'DELETE',
  }).then((r) => asJson<void>(r));
}
