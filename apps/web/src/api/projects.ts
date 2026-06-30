import { apiFetch, asJson } from './client';
import type { ProjectDto, MemberDto } from '@moongatracker/shared-types';

export function fetchProjects(): Promise<ProjectDto[]> {
  return apiFetch('/api/projects').then((r) => asJson<ProjectDto[]>(r));
}

export function createProject(name: string): Promise<ProjectDto> {
  return apiFetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<ProjectDto>(r));
}

export function updateProject(
  projectId: string,
  name: string,
): Promise<ProjectDto> {
  return apiFetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<ProjectDto>(r));
}

export function fetchProjectMembers(projectId: string): Promise<MemberDto[]> {
  return apiFetch(`/api/projects/${projectId}/members`).then((r) =>
    asJson<MemberDto[]>(r),
  );
}

export function addMember(
  projectId: string,
  email: string,
): Promise<MemberDto> {
  return apiFetch(`/api/projects/${projectId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then((r) => asJson<MemberDto>(r));
}

export function removeMember(projectId: string, userId: string): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  }).then(async (r) => {
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  });
}
