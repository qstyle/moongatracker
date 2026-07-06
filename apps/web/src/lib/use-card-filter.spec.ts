import { describe, it, expect } from 'vitest';
import { ColumnDto, CardDto } from '@moonga-studio/shared-types';
import { filterColumns, FilterState } from './use-card-filter';

const card = (id: string, title: string, body?: string): CardDto => ({
  id,
  projectId: 'proj-1',
  columnId: 'col-1',
  title,
  body: body ?? null,
  priority: null,
  order: 0,
  author: { type: 'user', id: null, name: null },
  assignee: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const col = (id: string, cards: CardDto[]): ColumnDto => ({
  id,
  projectId: 'proj-1',
  title: id,
  order: 0,
  cards,
});

const empty: FilterState = { search: '' };

describe('filterColumns', () => {
  it('returns same reference when filter is empty', () => {
    const cols = [col('idea', [card('1', 'Hello')])];
    expect(filterColumns(cols, empty)).toBe(cols);
  });

  it('filters by title substring (case-insensitive)', () => {
    const cols = [col('idea', [card('1', 'Buy milk'), card('2', 'Fix bug')])];
    const result = filterColumns(cols, { search: 'MiLk' });
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
    const result = filterColumns(cols, { search: 'the thing' });
    expect(result[0].cards[0].id).toBe('1');
    expect(result[0].cards).toHaveLength(1);
  });

  it('keeps columns with zero cards after filter', () => {
    const cols = [
      col('idea', [card('1', 'Foo')]),
      col('backlog', [card('2', 'Bar')]),
    ];
    const result = filterColumns(cols, { search: 'Foo' });
    expect(result).toHaveLength(2);
    expect(result[1].cards).toHaveLength(0);
  });

  it('shows all cards when search is empty', () => {
    const cols = [col('idea', [card('1', 'X'), card('2', 'Y')])];
    const result = filterColumns(cols, { search: '' });
    expect(result[0].cards).toHaveLength(2);
  });
});
