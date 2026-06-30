import { describe, it, expect } from 'vitest';
import { ColumnDto, CardDto } from '@moongatracker/shared-types';
import { filterColumns, FilterState } from './use-card-filter';

const card = (
  id: string,
  title: string,
  body?: string,
  labelIds: string[] = [],
): CardDto => ({
  id,
  columnKey: 'idea',
  title,
  body: body ?? null,
  priority: 0,
  order: 0,
  labels: labelIds.map((lid) => ({ id: lid, name: lid, color: '#000' })),
});

const col = (key: string, cards: CardDto[]): ColumnDto => ({
  id: `col-${key}`,
  key: key as ColumnDto['key'],
  title: key,
  order: 0,
  cards,
});

const empty: FilterState = { search: '', labelIds: new Set() };

describe('filterColumns', () => {
  it('returns same reference when filter is empty', () => {
    const cols = [col('idea', [card('1', 'Hello')])];
    expect(filterColumns(cols, empty)).toBe(cols);
  });

  it('filters by title substring (case-insensitive)', () => {
    const cols = [col('idea', [card('1', 'Buy milk'), card('2', 'Fix bug')])];
    const result = filterColumns(cols, { search: 'MiLk', labelIds: new Set() });
    expect(result[0].cards).toHaveLength(1);
    expect(result[0].cards[0].id).toBe('1');
  });

  it('filters by body text', () => {
    const cols = [
      col('idea', [
        card('1', 'Task', 'do the thing'),
        card('2', 'Other', 'nothing'),
      ]),
    ];
    const result = filterColumns(cols, {
      search: 'the thing',
      labelIds: new Set(),
    });
    expect(result[0].cards[0].id).toBe('1');
    expect(result[0].cards).toHaveLength(1);
  });

  it('keeps columns with zero cards after filter', () => {
    const cols = [
      col('idea', [card('1', 'Foo')]),
      col('backlog', [card('2', 'Bar')]),
    ];
    const result = filterColumns(cols, { search: 'Foo', labelIds: new Set() });
    expect(result).toHaveLength(2);
    expect(result[1].cards).toHaveLength(0);
  });

  it('filters by label (OR logic — any matching label)', () => {
    const cols = [
      col('idea', [
        card('1', 'Alpha', '', ['bug']),
        card('2', 'Beta', '', ['feature']),
        card('3', 'Gamma', '', []),
      ]),
    ];
    const result = filterColumns(cols, {
      search: '',
      labelIds: new Set(['bug']),
    });
    expect(result[0].cards.map((c) => c.id)).toEqual(['1']);
  });

  it('combines search and label filter (both must match)', () => {
    const cols = [
      col('idea', [
        card('1', 'bug fix', '', ['bug']),
        card('2', 'bug report', '', ['feature']),
        card('3', 'feature work', '', ['bug']),
      ]),
    ];
    const result = filterColumns(cols, {
      search: 'bug',
      labelIds: new Set(['bug']),
    });
    expect(result[0].cards.map((c) => c.id)).toEqual(['1']);
  });

  it('shows all cards when labelIds is empty (no label filter)', () => {
    const cols = [
      col('idea', [card('1', 'X', '', ['a']), card('2', 'Y', '', ['b'])]),
    ];
    const result = filterColumns(cols, { search: '', labelIds: new Set() });
    expect(result[0].cards).toHaveLength(2);
  });
});
