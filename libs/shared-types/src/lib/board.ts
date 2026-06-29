export type ColumnKey = 'idea' | 'triage' | 'backlog' | 'in_dev' | 'done';

export interface CardDto {
  id: string;
  title: string;
  body: string | null;
  priority: number;
  order: number;
}

export interface ColumnDto {
  id: string;
  key: ColumnKey;
  title: string;
  order: number;
  cards: CardDto[];
}

export interface BoardDto {
  id: string;
  name: string;
  createdAt: string;
  columns: ColumnDto[];
}
