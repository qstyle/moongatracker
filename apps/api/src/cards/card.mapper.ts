import { CardDto } from '@moongatracker/shared-types';

export interface PrismaCardLike {
  id: string;
  columnKey: string;
  title: string;
  body: string | null;
  priority: number;
  order: number;
  labels?: { label: { id: string; name: string; color: string } }[];
}

export function toCardDto(card: PrismaCardLike): CardDto {
  return {
    id: card.id,
    columnKey: card.columnKey as CardDto['columnKey'],
    title: card.title,
    body: card.body,
    priority: card.priority,
    order: card.order,
    labels: (card.labels ?? []).map((cl) => ({
      id: cl.label.id,
      name: cl.label.name,
      color: cl.label.color,
    })),
  };
}
