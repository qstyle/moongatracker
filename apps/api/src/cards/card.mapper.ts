import { CardDto, CardPriority } from '@moongatracker/shared-types';

export interface PrismaCardLike {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  body: string | null;
  priority: string | null;
  authorType: string;
  authorId: string | null;
  assigneeType: string | null;
  assigneeId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { attachments: number };
}

export function toCardDto(card: PrismaCardLike): CardDto {
  return {
    id: card.id,
    projectId: card.projectId,
    columnId: card.columnId,
    title: card.title,
    body: card.body,
    priority: card.priority as CardPriority | null,
    author: {
      type: card.authorType as 'user' | 'agent',
      id: card.authorId ?? null,
      name: null,
    },
    assignee: card.assigneeType
      ? {
          type: card.assigneeType as 'user' | 'agent',
          id: card.assigneeId ?? null,
          name: null,
        }
      : null,
    order: card.order,
    attachmentCount: card._count?.attachments ?? 0,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}
