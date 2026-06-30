import { apiFetch, asJson } from './client';
import type {
  ProjectDto,
  ProjectSummaryDto,
} from '@moongatracker/shared-types';

export function fetchProjects(orgId: string): Promise<ProjectSummaryDto[]> {
  return apiFetch(`/api/orgs/${orgId}/projects`).then((r) =>
    asJson<ProjectSummaryDto[]>(r),
  );
}

export function fetchProject(projectId: string): Promise<ProjectDto> {
  return apiFetch(`/api/projects/${projectId}`).then((r) =>
    asJson<ProjectDto>(r),
  );
}

export function createProject(
  orgId: string,
  name: string,
): Promise<ProjectSummaryDto> {
  return apiFetch(`/api/orgs/${orgId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<ProjectSummaryDto>(r));
}

export function updateProject(
  projectId: string,
  name: string,
): Promise<ProjectSummaryDto> {
  return apiFetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => asJson<ProjectSummaryDto>(r));
}
