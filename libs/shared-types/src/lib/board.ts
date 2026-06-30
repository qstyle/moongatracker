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
  /** Display color (hex). Users get their membership color; agents a fixed hue. */
  color?: string | null;
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
  boardId: string;
  columnId: string;
  /** Per-board sequential number, assigned at creation, immutable. */
  number: number;
  title: string;
  body: string | null;
  priority: CardPriority | null;
  author: ActorDto;
  assignee: ActorDto | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}

export interface ColumnDto {
  id: string;
  boardId: string;
  title: string;
  order: number;
  cards: CardDto[];
}

export interface BoardDto {
  id: string;
  projectId: string;
  name: string;
  /** Per-project ordinal of the board, used in the card key prefix. */
  seq: number;
  createdAt: string;
  columns: ColumnDto[];
}

export interface BoardSummaryDto {
  id: string;
  projectId: string;
  name: string;
  seq: number;
  createdAt: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  ownerId: string | null;
  createdAt: string;
}

export interface MemberDto {
  userId: string;
  email: string;
  name: string | null;
  color: string;
  createdAt: string;
}

export interface CreateBoardInput {
  projectId: string;
  name: string;
}

export interface CreateCardInput {
  boardId: string;
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
  boardId: string;
  title: string;
}

export interface UpdateColumnInput {
  title?: string;
  order?: number;
}

export interface ReorderColumnsInput {
  boardId: string;
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

export interface AttachmentDto {
  id: string;
  cardId: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url?: string; // presigned GET URL, populated by API
}
