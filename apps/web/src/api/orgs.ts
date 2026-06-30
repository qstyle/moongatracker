import { apiFetch, asJson } from './client';
import type { OrgDto, MemberDto } from '@moongatracker/shared-types';

export function fetchOrgs(): Promise<OrgDto[]> {
  return apiFetch('/api/orgs').then((r) => asJson<OrgDto[]>(r));
}

export function createOrg(name: string): Promise<OrgDto> {
  return apiFetch('/api/orgs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<OrgDto>(r));
}

export function updateOrg(orgId: string, name: string): Promise<OrgDto> {
  return apiFetch(`/api/orgs/${orgId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<OrgDto>(r));
}

export function fetchOrgMembers(orgId: string): Promise<MemberDto[]> {
  return apiFetch(`/api/orgs/${orgId}/members`).then((r) =>
    asJson<MemberDto[]>(r),
  );
}
