import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BoardSelectPage } from './board-select';

vi.mock('../api/projects', () => ({
  fetchProjects: vi.fn(),
}));
vi.mock('../api/boards', () => ({
  fetchBoards: vi.fn(),
}));

import { fetchProjects } from '../api/projects';
import { fetchBoards } from '../api/boards';

function renderAt(path: string) {
  const { hook, history } = memoryLocation({ path, record: true });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Router hook={hook}>
        <BoardSelectPage />
      </Router>
    </QueryClientProvider>,
  );
  return { history };
}

describe('BoardSelectPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to the first available board, never fetching board "select"', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { id: 'p1', name: 'P1', ownerId: null, createdAt: '' },
    ]);
    vi.mocked(fetchBoards).mockResolvedValue([
      { id: 'b1', projectId: 'p1', name: 'Board 1', seq: 1, createdAt: '' },
    ]);

    const { history } = renderAt('/boards/select');

    await waitFor(() =>
      expect(history[history.length - 1]).toBe('/boards/b1'),
    );
    // The whole point of the fix: no attempt to load the literal "select".
    expect(fetchBoards).not.toHaveBeenCalledWith('select');
  });

  it('shows an empty state when no boards exist', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { id: 'p1', name: 'P1', ownerId: null, createdAt: '' },
    ]);
    vi.mocked(fetchBoards).mockResolvedValue([]);

    renderAt('/boards/select');

    // getByText throws if the node is absent, so this asserts presence.
    await waitFor(() => expect(screen.getByText(/создайте доску/i)).toBeTruthy());
  });
});
