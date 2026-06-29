import { ColumnKey } from '@moongatracker/shared-types';

export type ViewId = 'all' | 'ideas' | 'dev';

export interface ViewDef {
  id: ViewId;
  label: string;
  /** null = все колонки */
  columns: ColumnKey[] | null;
}

export const VIEWS: ViewDef[] = [
  { id: 'all', label: 'Всё', columns: null },
  { id: 'ideas', label: 'Идеи', columns: ['idea', 'triage'] },
  { id: 'dev', label: 'Разработка', columns: ['backlog', 'in_dev', 'done'] },
];
