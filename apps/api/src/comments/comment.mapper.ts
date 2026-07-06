import { CommentDto } from '@moonga-studio/shared-types';

export interface PrismaCommentLike {
  id: string;
  cardId: string;
  authorType: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
}

export function toCommentDto(c: PrismaCommentLike): CommentDto {
  return {
    id: c.id,
    cardId: c.cardId,
    authorType: c.authorType === 'agent' ? 'agent' : 'user',
    authorId: c.authorId,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  };
}
