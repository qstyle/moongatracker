export type CardPriority = 'urgent' | 'normal' | 'low';

export interface PriorityMeta {
  key: CardPriority;
  label: string;
  color: string;
  weight: number;
}

export const PRIORITIES: PriorityMeta[] = [
  { key: 'urgent', label: 'Срочно', color: '#e11d48', weight: 3 },
  { key: 'normal', label: 'Обычный', color: '#f59e0b', weight: 2 },
  { key: 'low', label: 'Низкий', color: '#64748b', weight: 1 },
];

export interface ActorDto {
  type: 'user' | 'agent';
  id: string | null;
  name: string | null;
}

export interface CommentDto {
  id: string;
  cardId: string;
  authorType: 'user' | 'agent';
  authorId: string | null;
  body: string;
  createdAt: string;
}

export interface CardDto {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  body: string | null;
  priority: CardPriority | null;
  author: ActorDto;
  assignee: ActorDto | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnDto {
  id: string;
  projectId: string;
  title: string;
  order: number;
  cards: CardDto[];
}

export interface ProjectDto {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
  columns: ColumnDto[];
}

export interface ProjectSummaryDto {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

export interface OrgDto {
  id: string;
  name: string;
  createdAt: string;
}

export interface MemberDto {
  userId: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface CreateProjectInput {
  orgId: string;
  name: string;
}

export interface CreateCardInput {
  projectId: string;
  columnId: string;
  title: string;
  body?: string | null;
}

export interface UpdateCardInput {
  title?: string;
  body?: string | null;
  columnId?: string;
  order?: number;
  priority?: CardPriority | null;
  assigneeType?: string | null;
  assigneeId?: string | null;
}

export interface CreateColumnInput {
  projectId: string;
  title: string;
}

export interface UpdateColumnInput {
  title?: string;
  order?: number;
}

export interface ReorderColumnsInput {
  projectId: string;
  orderedIds: string[];
}

export interface ActivityDto {
  id: string;
  cardId: string;
  actorType: 'user' | 'agent';
  actorId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}
