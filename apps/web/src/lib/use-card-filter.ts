import { useMemo } from 'react';
import { ColumnDto } from '@moongatracker/shared-types';

export interface FilterState {
  search: string;
}

export function filterColumns(
  columns: ColumnDto[],
  filter: FilterState,
): ColumnDto[] {
  const trimmed = filter.search.trim().toLowerCase();
  if (!trimmed) return columns;

  return columns.map((col) => ({
    ...col,
    cards: col.cards.filter((card) => {
      return (
        card.title.toLowerCase().includes(trimmed) ||
        (card.body?.toLowerCase().includes(trimmed) ?? false)
      );
    }),
  }));
}

export function useCardFilter(
  columns: ColumnDto[],
  filter: FilterState,
): ColumnDto[] {
  return useMemo(() => filterColumns(columns, filter), [columns, filter]);
}
