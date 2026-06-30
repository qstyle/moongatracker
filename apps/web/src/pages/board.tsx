import { useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBoard } from '../api/boards';
import { useBoardSocket } from '../api/socket';
import { Board } from '../components/board/board';

export function BoardPage() {
  const [, params] = useRoute('/boards/:boardId');
  const [, cardParams] = useRoute('/boards/:boardId/cards/:cardKey');
  const boardId = params?.boardId ?? cardParams?.boardId ?? '';
  const queryClient = useQueryClient();

  useBoardSocket(boardId, queryClient);

  const {
    data: board,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId),
    enabled: !!boardId,
  });

  if (!boardId)
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Выберите доску в боковой панели
      </div>
    );

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center animate-pulse text-sm uppercase tracking-wider text-muted-foreground">
        загрузка…
      </div>
    );

  if (error || !board)
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Ошибка загрузки доски
      </div>
    );

  return (
    <Board
      board={board}
      onChanged={() =>
        queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      }
    />
  );
}
