import {
  ProposalAction,
  ProposalDto,
  ProposalStatus,
} from '@moongatracker/shared-types';

type ProposalRow = {
  id: string;
  projectId: string;
  cardId: string | null;
  action: string;
  reason: string | null;
  payload: unknown;
  status: string;
  actorType: string;
  actorId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

export function toProposalDto(p: ProposalRow): ProposalDto {
  const payload = (p.payload ?? {}) as { cardTitle?: string; cardKey?: string };
  return {
    id: p.id,
    projectId: p.projectId,
    cardId: p.cardId,
    action: p.action as ProposalAction,
    reason: p.reason,
    status: p.status as ProposalStatus,
    actorType: p.actorType === 'agent' ? 'agent' : 'user',
    actorId: p.actorId,
    cardTitle: payload.cardTitle ?? null,
    cardKey: payload.cardKey ?? null,
    createdAt: p.createdAt.toISOString(),
    resolvedAt: p.resolvedAt ? p.resolvedAt.toISOString() : null,
  };
}
