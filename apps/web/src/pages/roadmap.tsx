import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchStages,
  createStage,
  updateStage,
  deleteStage,
  seedDefaultStages,
} from '../api/stages';
import { createBoard } from '../api/boards';

export function RoadmapPage() {
  const [, params] = useRoute('/projects/:projectId/roadmap');
  const projectId = params?.projectId ?? '';
  const qc = useQueryClient();
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['stages', projectId],
    queryFn: () => fetchStages(projectId),
    enabled: !!projectId,
  });

  const [newStage, setNewStage] = useState('');
  const [addingBoardFor, setAddingBoardFor] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stages', projectId] });
    qc.invalidateQueries({ queryKey: ['boards', projectId] });
  };

  if (isLoading)
    return <div className="p-6 text-sm text-muted-foreground">загрузка…</div>;

  if (stages.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-sm space-y-3 rounded border border-border/60 bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            У проекта пока нет роадмапа.
          </div>
          <Button
            onClick={async () => {
              await seedDefaultStages(projectId);
              invalidate();
            }}
          >
            Создать стадии по умолчанию
          </Button>
        </div>
      </div>
    );
  }

  async function advance(stageId: string) {
    const idx = stages.findIndex((s) => s.id === stageId);
    await updateStage(stageId, { status: 'done' });
    if (stages[idx + 1]) await updateStage(stages[idx + 1].id, { status: 'active' });
    invalidate();
  }

  async function addBoard(stageId: string) {
    if (!boardName.trim()) return;
    await createBoard(projectId, boardName.trim(), stageId);
    setBoardName('');
    setAddingBoardFor(null);
    invalidate();
  }

  async function addStage() {
    if (!newStage.trim()) return;
    await createStage(projectId, newStage.trim());
    setNewStage('');
    invalidate();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 text-sm font-semibold uppercase tracking-wider">
        Роадмап
      </div>
      <div className="flex flex-col gap-3">
        {stages.map((s) => (
          <div
            key={s.id}
            className={[
              'rounded border p-4',
              s.status === 'active' ? 'border-primary' : 'border-border/60',
            ].join(' ')}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="font-medium text-foreground">{s.title}</div>
                <span className="text-xs text-muted-foreground">
                  {s.status === 'active'
                    ? '● текущая'
                    : s.status === 'done'
                      ? '✓ пройдена'
                      : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {s.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => advance(s.id)}>
                    Продвинуть
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await deleteStage(s.id);
                    invalidate();
                  }}
                >
                  Удалить
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.boards.map((b) => (
                <Link
                  key={b.id}
                  href={`/boards/${b.id}`}
                  className="rounded border border-border bg-muted px-2 py-1 text-sm text-foreground hover:underline"
                >
                  {b.name}
                </Link>
              ))}
              {addingBoardFor === s.id ? (
                <Input
                  autoFocus
                  value={boardName}
                  placeholder="Название доски"
                  className="h-8 w-44"
                  onChange={(e) => setBoardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addBoard(s.id);
                    if (e.key === 'Escape') {
                      setBoardName('');
                      setAddingBoardFor(null);
                    }
                  }}
                />
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingBoardFor(s.id)}
                >
                  ＋ Создать доску
                </Button>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newStage}
            placeholder="Новая стадия"
            className="h-8 w-52"
            onChange={(e) => setNewStage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addStage();
            }}
          />
          <Button size="sm" disabled={!newStage.trim()} onClick={addStage}>
            Добавить стадию
          </Button>
        </div>
      </div>
    </div>
  );
}
