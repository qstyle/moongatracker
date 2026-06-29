import { useCallback, useEffect, useState } from 'react';
import { BoardDto } from '@moongatracker/shared-types';
import { fetchBoards } from '../api/boards';
import { Board } from '../components/board/board';

export function App() {
  const [boards, setBoards] = useState<BoardDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchBoards()
      .then(setBoards)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="border border-destructive/50 bg-card px-4 py-3 text-[12px] text-destructive">
          Ошибка загрузки: {error}
        </div>
      </div>
    );
  }

  if (!boards) {
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

  return <Board board={board} onChanged={load} />;
}

export default App;
