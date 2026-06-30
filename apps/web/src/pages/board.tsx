import { useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProject } from '../api/projects';
import { useProjectSocket } from '../api/socket';
import { Board } from '../components/board/board';

export function BoardPage() {
  const [, params] = useRoute('/projects/:projectId');
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();

  useProjectSocket(projectId, queryClient);

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  });

  if (!projectId)
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
        Выберите проект в боковой панели
      </div>
    );

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center animate-pulse text-[11px] uppercase tracking-wider text-muted-foreground">
        загрузка…
      </div>
    );

  if (error || !project)
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-destructive">
        Ошибка загрузки проекта
      </div>
    );

  return (
    <Board
      project={project}
      onChanged={() =>
        queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      }
    />
  );
}
