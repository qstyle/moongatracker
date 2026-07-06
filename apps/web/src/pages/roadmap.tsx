import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StageDto } from '@moongatracker/shared-types';
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

  // Board name is derived from the stage automatically; a numeric suffix keeps
  // multiple boards of one stage unique.
  async function addBoard(stage: StageDto) {
    const n = stage.boards.length;
    const name = n === 0 ? stage.title : `${stage.title} ${n + 1}`;
    await createBoard(projectId, name, stage.id);
    invalidate();
  }

  async function addStage() {
    if (!newStage.trim()) return;
    await createStage(projectId, newStage.trim());
    setNewStage('');
    invalidate();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-6 text-sm font-semibold uppercase tracking-wider">
        Роадмап
      </div>
      <div className="flex flex-1 items-start gap-3 overflow-x-auto pb-4">
        {stages.map((s) => (
          <div
            key={s.id}
            className={[
              'flex w-64 shrink-0 flex-col gap-2 rounded border p-3',
              s.status === 'active' ? 'border-primary' : 'border-border/60',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {s.status === 'active'
                    ? '● текущая'
                    : s.status === 'done'
                      ? '✓ пройдена'
                      : 'не начата'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {s.status === 'active' && (
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => advance(s.id)}>
                  Продвинуть
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={async () => {
                  await deleteStage(s.id);
                  invalidate();
                }}
              >
                Удалить
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              {s.boards.map((b) => (
                <Link
                  key={b.id}
                  href={`/boards/${b.id}`}
                  className="truncate rounded border border-border bg-muted px-2 py-1 text-sm text-foreground hover:underline"
                >
                  {b.name}
                </Link>
              ))}
              <Button size="sm" variant="ghost" className="justify-start" onClick={() => addBoard(s)}>
                ＋ Создать доску
              </Button>
            </div>
          </div>
        ))}

        <div className="flex w-56 shrink-0 flex-col gap-2 rounded border border-dashed border-border/60 p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            новая стадия
          </div>
          <Input
            value={newStage}
            placeholder="Название"
            className="h-8"
            onChange={(e) => setNewStage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addStage();
            }}
          />
          <Button size="sm" disabled={!newStage.trim()} onClick={addStage}>
            Добавить
          </Button>
        </div>
      </div>
    </div>
  );
}
