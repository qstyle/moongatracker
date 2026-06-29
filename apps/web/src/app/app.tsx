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
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {board.columns.map((c) => (
          <section
            key={c.id}
            style={{
              minWidth: 220,
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 8,
              background: '#fafafa',
            }}
          >
            <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>
              {c.title}{' '}
              <span style={{ color: '#999', fontWeight: 400 }}>
                ({c.cards.length})
              </span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.cards.map((card) => (
                <article
                  key={card.id}
                  style={{
                    border: '1px solid #e5e5e5',
                    borderRadius: 6,
                    padding: 8,
                    background: '#fff',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{card.title}</div>
                  {card.body && (
                    <div style={{ color: '#666', marginTop: 4 }}>
                      {card.body}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export default App;
