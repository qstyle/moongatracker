import { apiFetch, asJson } from './client';
import type { ProposalDto } from '@moonga-studio/shared-types';

export function fetchPendingProposals(): Promise<ProposalDto[]> {
  return apiFetch('/api/proposals/pending').then((r) =>
    asJson<ProposalDto[]>(r),
  );
}

export function approveProposal(id: string): Promise<ProposalDto> {
  return apiFetch(`/api/proposals/${id}/approve`, { method: 'POST' }).then((r) =>
    asJson<ProposalDto>(r),
  );
}

export function rejectProposal(id: string): Promise<ProposalDto> {
  return apiFetch(`/api/proposals/${id}/reject`, { method: 'POST' }).then((r) =>
    asJson<ProposalDto>(r),
  );
}
