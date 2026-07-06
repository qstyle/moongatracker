import { apiFetch, asJson } from './client';
import type {
  WikiTreeDto,
  WikiSectionDto,
  WikiPageDto,
} from '@moonga-studio/shared-types';

const json = { 'Content-Type': 'application/json' };

export function fetchWikiTree(projectId: string): Promise<WikiTreeDto> {
  return apiFetch(`/api/projects/${projectId}/wiki`).then((r) =>
    asJson<WikiTreeDto>(r),
  );
}

export function fetchWikiPage(pageId: string): Promise<WikiPageDto> {
  return apiFetch(`/api/wiki/pages/${pageId}`).then((r) =>
    asJson<WikiPageDto>(r),
  );
}

export function seedWiki(projectId: string): Promise<WikiTreeDto> {
  return apiFetch(`/api/projects/${projectId}/wiki/seed`, {
    method: 'POST',
  }).then((r) => asJson<WikiTreeDto>(r));
}

export function createWikiSection(
  projectId: string,
  title: string,
): Promise<WikiSectionDto> {
  return apiFetch(`/api/projects/${projectId}/wiki/sections`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ title }),
  }).then((r) => asJson<WikiSectionDto>(r));
}

export function updateWikiSection(
  sectionId: string,
  patch: { title?: string; order?: number },
): Promise<WikiSectionDto> {
  return apiFetch(`/api/wiki/sections/${sectionId}`, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify(patch),
  }).then((r) => asJson<WikiSectionDto>(r));
}

export async function deleteWikiSection(sectionId: string): Promise<void> {
  const r = await apiFetch(`/api/wiki/sections/${sectionId}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function createWikiPage(
  projectId: string,
  sectionId: string,
  title: string,
): Promise<WikiPageDto> {
  return apiFetch(`/api/projects/${projectId}/wiki/pages`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ sectionId, title }),
  }).then((r) => asJson<WikiPageDto>(r));
}

export function updateWikiPage(
  pageId: string,
  patch: { title?: string; body?: string },
): Promise<WikiPageDto> {
  return apiFetch(`/api/wiki/pages/${pageId}`, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify(patch),
  }).then((r) => asJson<WikiPageDto>(r));
}

export async function deleteWikiPage(pageId: string): Promise<void> {
  const r = await apiFetch(`/api/wiki/pages/${pageId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}
