import { apiFetch, asJson } from './client';
import type {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';

export function fetchTokens(projectId: string): Promise<ApiTokenDto[]> {
  return apiFetch(`/api/projects/${projectId}/api-tokens`).then((r) =>
    asJson<ApiTokenDto[]>(r),
  );
}

export function createToken(
  projectId: string,
  name: string,
  scopes: string[],
): Promise<CreateApiTokenResponse> {
  return apiFetch(`/api/projects/${projectId}/api-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, scopes }),
  }).then((r) => asJson<CreateApiTokenResponse>(r));
}

export function revokeToken(projectId: string, id: string): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/api-tokens/${id}`, {
    method: 'DELETE',
  }).then((r) => asJson<void>(r));
}
