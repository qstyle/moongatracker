import { CommentDto } from '@moongatracker/shared-types';

export interface PrismaCommentLike {
  id: string;
  authorType: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
}

export function toCommentDto(c: PrismaCommentLike): CommentDto {
  return {
    id: c.id,
    authorType: c.authorType === 'agent' ? 'agent' : 'human',
    authorId: c.authorId,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  };
}
