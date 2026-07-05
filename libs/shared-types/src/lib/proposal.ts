export type ProposalAction = 'delete_card';
export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export interface ProposalDto {
  id: string;
  projectId: string;
  cardId: string | null;
  action: ProposalAction;
  reason: string | null;
  status: ProposalStatus;
  actorType: 'user' | 'agent';
  actorId: string | null;
  /** Denormalized context for display (from payload snapshot). */
  cardTitle: string | null;
  cardKey: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
