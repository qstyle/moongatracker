import { Fragment, useState, type CSSProperties } from 'react';
import { Link, useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RiSearchEyeLine,
  RiPencilRuler2Line,
  RiHammerLine,
  RiRocketLine,
  RiGlobalLine,
  RiFlag2Line,
  RiCheckLine,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiKanbanView,
  RiAddLine,
  RiCloseLine,
  type RemixiconComponentType,
} from '@remixicon/react';
import type { StageDto } from '@moonga-studio/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchStages,
  createStage,
  updateStage,
  deleteStage,
  seedDefaultStages,
  scaffoldStage,
} from '../api/stages';
import { createBoard } from '../api/boards';

// Same dotted grid backdrop as the kanban board.
const GRID_BG: CSSProperties = {
  backgroundImage:
    'linear-gradient(color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px),' +
    'linear-gradient(90deg, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
  backgroundPosition: '-1px -1px',
};

const STAGE_ICONS: Record<string, RemixiconComponentType> = {
  discovery: RiSearchEyeLine,
  design: RiPencilRuler2Line,
  build: RiHammerLine,
  release: RiRocketLine,
  operate: RiGlobalLine,
};
function stageIcon(key: string | null): RemixiconComponentType {
  return (key && STAGE_ICONS[key]) || RiFlag2Line;
}

const TEMPLATE_KEYS = new Set(['discovery', 'design', 'build', 'release', 'operate']);

const STAGE_EXIT_CRITERIA: Record<string, string> = {
  discovery: 'Одни и те же боли повторяются в 3+ интервью; принято решение GO / PIVOT / KILL.',
  design: 'Выбран один вариант решения, задача «concrete enough», задан таймбокс (аппетит) и scope MVP.',
  build: 'Feature-freeze: MVP feature-complete, критичные пути покрыты тестами.',
  release: 'Пройдены alpha→beta→GA, нет showstopper-багов, чеклист релиза закрыт.',
  operate: 'Финального гейта нет — этап конечный (мониторинг, поддержка, итерации).',
};

// ---------------------------------------------------------------------------
// StageCard — shared renderer for both pipeline and history sections
// ---------------------------------------------------------------------------
interface StageCardProps {
  s: StageDto;
  displayIndex: number; // 1-based number shown on the card
  animationDelay: number; // ms
  scaffoldingId: string | null;
  // actions — undefined = history mode (no mutation actions rendered)
  onDelete?: () => void;
  onAddBoard?: () => void;
  onScaffold?: () => void;
  onAdvance?: () => void;
}

function StageCard({
  s,
  displayIndex,
  animationDelay,
  scaffoldingId,
  onDelete,
  onAddBoard,
  onScaffold,
  onAdvance,
}: StageCardProps) {
  const Icon = stageIcon(s.key);
  const done = s.status === 'done';
  const active = s.status === 'active';
  const isHistory = !onDelete; // history mode when mutation callbacks are absent

  return (
    <div
      className={[
        'group relative flex w-64 shrink-0 flex-col gap-3 rounded-2xl border p-4 transition-transform duration-200',
        isHistory
          ? 'border-border/40 bg-card/30 opacity-75'
          : active
            ? 'border-primary/50 bg-primary/[0.04] shadow-[0_10px_40px_-24px_var(--primary)] ring-1 ring-primary/25 hover:-translate-y-0.5'
            : 'border-border/60 bg-card/40 hover:-translate-y-0.5',
      ].join(' ')}
      style={{ animation: 'rmIn .4s ease both', animationDelay: `${animationDelay}ms` }}
    >
      {/* header: medallion + title */}
      <div className="flex items-start gap-3">
        <div
          className={[
            'grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
            done
              ? 'bg-primary text-primary-foreground'
              : active
                ? 'bg-primary/10 text-primary ring-2 ring-primary/40'
                : 'bg-muted text-muted-foreground',
          ].join(' ')}
        >
          {done ? <RiCheckLine size={20} /> : <Icon size={18} />}
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/70">
              {String(displayIndex).padStart(2, '0')}
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {s.title}
            </span>
          </div>
          <div
            className={[
              'text-[11px] font-medium',
              active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/60',
            ].join(' ')}
          >
            {active ? '● текущая' : done ? '✓ пройдена' : 'не начата'}
          </div>
        </div>
        {/* remove stage — appears on hover, only in pipeline mode */}
        {onDelete && (
          <button
            type="button"
            aria-label="Удалить стадию"
            onClick={onDelete}
            className="ml-auto -mr-1 -mt-1 grid size-6 place-items-center rounded-md text-muted-foreground/40 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
          >
            <RiCloseLine size={15} />
          </button>
        )}
      </div>

      {/* mini dashboard */}
      <div className="flex flex-col gap-1.5">
        <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
          <div className="text-lg font-semibold leading-none tabular-nums text-foreground">
            {s.boards.length}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            доски
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ['открыто', s.taskCounts.open, 'text-foreground'],
            ['в работе', s.taskCounts.inProgress, 'text-primary'],
            ['готово', s.taskCounts.done, 'text-emerald-500'],
          ] as const).map(([label, n, color]) => (
            <div key={label} className="rounded-lg bg-muted/50 px-2 py-1.5">
              <div className={['text-base font-semibold leading-none tabular-nums', color].join(' ')}>
                {n}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* boards */}
      <div className="flex flex-col gap-1.5">
        {s.boards.map((b) => (
          <Link
            key={b.id}
            href={`/boards/${b.id}`}
            className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-muted"
          >
            <RiKanbanView size={13} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{b.name}</span>
          </Link>
        ))}
        {/* Board actions only in pipeline mode */}
        {!isHistory && (
          s.boards.length === 0 && s.key && TEMPLATE_KEYS.has(s.key) ? (
            <Button
              size="sm"
              disabled={!!scaffoldingId}
              onClick={onScaffold}
              className="h-8 w-full"
            >
              {scaffoldingId === s.id ? 'Разворачиваю…' : 'Развернуть этап'}
            </Button>
          ) : (
            <button
              type="button"
              onClick={onAddBoard}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 px-2.5 py-1.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <RiAddLine size={14} /> Создать доску
            </button>
          )
        )}
      </div>

      {/* Advance action — only for the active stage in pipeline mode */}
      {!isHistory && active && (
        <div className="mt-1 flex flex-col gap-1.5">
          {s.key && STAGE_EXIT_CRITERIA[s.key] && (
            <p className="text-[11px] leading-snug text-muted-foreground/70">
              {STAGE_EXIT_CRITERIA[s.key]}
            </p>
          )}
          <Button size="sm" variant="outline" className="h-8" onClick={onAdvance}>
            Продвинуть дальше
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoadmapPage
// ---------------------------------------------------------------------------
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
  const [scaffoldingId, setScaffoldingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stages', projectId] });
    qc.invalidateQueries({ queryKey: ['boards', projectId] });
  };

  if (isLoading)
    return <div className="p-6 text-sm text-muted-foreground">загрузка…</div>;

  if (stages.length === 0) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-sm space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <RiRocketLine size={22} />
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-foreground">Роадмап пуст</div>
            <div className="text-sm text-muted-foreground">
              Соберите путь стартапа — от идеи до прода.
            </div>
          </div>
          <Button
            className="w-full"
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

  const total = stages.length;
  const doneCount = stages.filter((s) => s.status === 'done').length;
  const activeIdx = stages.findIndex((s) => s.status === 'active');
  const totalBoards = stages.reduce((n, s) => n + s.boards.length, 0);
  const pct = Math.round(((doneCount + (activeIdx >= 0 ? 0.5 : 0)) / total) * 100);

  // Split stages for pipeline vs history
  const activeStages = stages.filter((s) => s.status !== 'done');
  const doneStages = stages.filter((s) => s.status === 'done');

  // Global index map so display numbers always reflect original ordering
  const globalIndex = new Map(stages.map((s, i) => [s.id, i + 1]));

  async function advance(stageId: string) {
    const idx = stages.findIndex((s) => s.id === stageId);
    await updateStage(stageId, { status: 'done' });
    if (stages[idx + 1]) await updateStage(stages[idx + 1].id, { status: 'active' });
    invalidate();
  }

  async function addBoard(stage: StageDto) {
    const n = stage.boards.length;
    const name = n === 0 ? stage.title : `${stage.title} ${n + 1}`;
    await createBoard(projectId, name, stage.id);
    invalidate();
  }

  async function handleScaffold(stageId: string) {
    if (scaffoldingId) return;
    setScaffoldingId(stageId);
    try {
      await scaffoldStage(projectId, stageId);
      invalidate();
    } finally {
      setScaffoldingId(null);
    }
  }

  async function addStage() {
    if (!newStage.trim()) return;
    await createStage(projectId, newStage.trim());
    setNewStage('');
    invalidate();
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <style>{`@keyframes rmIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* Header with pipeline progress */}
      <div className="flex items-end justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
            Роадмап
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {activeIdx >= 0 ? `Стадия ${activeIdx + 1} из ${total}` : `${total} стадий`}
            {' · '}
            {totalBoards} {totalBoards === 1 ? 'доска' : 'досок'}
          </div>
        </div>
        <div className="hidden w-56 items-center gap-3 sm:flex">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {pct}%
          </div>
        </div>
      </div>

      {/* Stages wrap onto new rows; the track is the only scroll surface. */}
      <div className="h-full flex-1 overflow-auto p-6" style={GRID_BG}>
        {/* ── Active pipeline ── */}
        <div className="flex flex-wrap items-start gap-x-2 gap-y-4">
          {activeStages.map((s, i) => (
            <Fragment key={s.id}>
              <StageCard
                s={s}
                displayIndex={globalIndex.get(s.id) ?? i + 1}
                animationDelay={i * 60}
                scaffoldingId={scaffoldingId}
                onDelete={async () => { await deleteStage(s.id); invalidate(); }}
                onAddBoard={() => addBoard(s)}
                onScaffold={() => handleScaffold(s.id)}
                onAdvance={() => advance(s.id)}
              />
              {i < activeStages.length - 1 && (
                <div className="flex shrink-0 items-center self-center">
                  <div className="h-px w-3 bg-border" />
                  <RiArrowRightSLine size={18} className="text-muted-foreground/40" />
                </div>
              )}
            </Fragment>
          ))}

          {/* add-stage column */}
          <div className="flex w-52 shrink-0 flex-col justify-center gap-2 self-start rounded-2xl border border-dashed border-border/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
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

        {/* ── История (done stages) ── */}
        {doneStages.length > 0 && (
          <div className="mt-8">
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="mb-4 flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {historyOpen ? (
                <RiArrowDownSLine size={18} className="transition-transform" />
              ) : (
                <RiArrowRightSLine size={18} className="transition-transform" />
              )}
              История ({doneStages.length})
            </button>

            {historyOpen && (
              <div className="flex flex-wrap items-start gap-x-2 gap-y-4">
                {doneStages.map((s, i) => (
                  <Fragment key={s.id}>
                    <StageCard
                      s={s}
                      displayIndex={globalIndex.get(s.id) ?? i + 1}
                      animationDelay={i * 40}
                      scaffoldingId={null}
                      /* no callbacks = history mode */
                    />
                    {i < doneStages.length - 1 && (
                      <div className="flex shrink-0 items-center self-center">
                        <div className="h-px w-3 bg-primary/40" />
                        <RiArrowRightSLine size={18} className="text-primary/40" />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
