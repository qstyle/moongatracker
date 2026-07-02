import { useQueries, useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { fetchProjects } from '../api/projects';
import { fetchBoards } from '../api/boards';

/**
 * Landing for `/boards/select`. This literal path must NOT be treated as a
 * board id (that caused GET /api/boards/select → 404 and an infinite spinner).
 * Instead we resolve the first available board across the user's projects and
 * redirect there, falling back to an empty state when none exist.
 */
export function BoardSelectPage() {
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const boardQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ['boards', project.id],
      queryFn: () => fetchBoards(project.id),
    })),
  });

  const boardsLoading = boardQueries.some((q) => q.isLoading);
  const firstBoard = boardQueries
    .flatMap((q) => q.data ?? [])
    .find(Boolean);

  if (projectsLoading || boardsLoading)
    return (
      <div className="flex h-full items-center justify-center animate-pulse text-sm uppercase tracking-wider text-muted-foreground">
        загрузка…
      </div>
    );

  if (firstBoard) return <Redirect to={`/boards/${firstBoard.id}`} replace />;

  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Создайте доску в боковой панели, чтобы начать
    </div>
  );
}
