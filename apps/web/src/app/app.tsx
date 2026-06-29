import { useEffect, useState } from 'react';
import { BoardDto } from '@moongatracker/shared-types';
import { fetchBoards } from '../api/boards';

export function App() {
  const [boards, setBoards] = useState<BoardDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoards()
      .then(setBoards)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div>Ошибка: {error}</div>;
  const board = boards[0];
  if (!board) return <div>Загрузка…</div>;

  return (
    <main style={{ padding: 16 }}>
      <h1>{board.name}</h1>
      <div style={{ display: 'flex', gap: 12 }}>
        {board.columns.map((c) => (
          <section
            key={c.id}
            style={{
              minWidth: 200,
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 8,
            }}
          >
            <h2 style={{ fontSize: 14 }}>{c.title}</h2>
          </section>
        ))}
      </div>
    </main>
  );
}

export default App;
