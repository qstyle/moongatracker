export type ColumnKey = 'idea' | 'triage' | 'backlog' | 'in_dev' | 'done';

export interface ColumnDto {
  id: string;
  key: ColumnKey;
  title: string;
  order: number;
}

export interface BoardDto {
  id: string;
  name: string;
  createdAt: string;
  columns: ColumnDto[];
}
