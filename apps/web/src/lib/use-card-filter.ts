import { useMemo } from 'react';
import { ColumnDto } from '@moongatracker/shared-types';

export type FilterState = { search: string; labelIds: Set<string> };

export function filterColumns(
  columns: ColumnDto[],
  filter: FilterState,
): ColumnDto[] {
  const trimmed = filter.search.trim().toLowerCase();
  if (!trimmed && filter.labelIds.size === 0) return columns;

  return columns.map((col) => ({
    ...col,
    cards: col.cards.filter((card) => {
      const text = `${card.title} ${card.body ?? ''}`.toLowerCase();
      const matchesSearch = !trimmed || text.includes(trimmed);
      const matchesLabels =
        filter.labelIds.size === 0 ||
        card.labels.some((l) => filter.labelIds.has(l.id));
      return matchesSearch && matchesLabels;
    }),
  }));
}

export function useCardFilter(
  columns: ColumnDto[],
  filter: FilterState,
): ColumnDto[] {
  return useMemo(() => filterColumns(columns, filter), [columns, filter]);
}
