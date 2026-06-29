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

export interface CreateCardInput {
  boardId: string;
  columnKey: ColumnKey;
  title: string;
  body?: string | null;
}

export interface UpdateCardInput {
  title?: string;
  body?: string | null;
  columnKey?: ColumnKey;
  order?: number;
  priority?: number;
}

export const COLUMN_KEYS: ColumnKey[] = [
  'idea',
  'triage',
  'backlog',
  'in_dev',
  'done',
];
