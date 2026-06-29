import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBoards } from '../api/boards';
import { Board } from '../components/board/board';

export function App() {
  const queryClient = useQueryClient();
  const {
    data: boards,
    error,
    isLoading,
  } = useQuery({ queryKey: ['boards'], queryFn: fetchBoards });

  const onChanged = () =>
    queryClient.invalidateQueries({ queryKey: ['boards'] });

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="border border-destructive/50 bg-card px-4 py-3 text-[12px] text-destructive">
          Ошибка загрузки: {String(error)}
        </div>
      </div>
    );
  }

  if (isLoading || !boards) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          загрузка…
        </div>
      </div>
    );
  }

  const board = boards[0];
  if (!board) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-[12px] text-muted-foreground">
        Досок пока нет
      </div>
    );
  }

  return <Board board={board} onChanged={onChanged} />;
}

export default App;
