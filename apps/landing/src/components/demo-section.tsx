import { useEffect, useRef, useState } from 'react';
import { Sparkles, CornerDownRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildAgentRun, type AgentRun, type ColumnKey } from '@/lib/agent-demo';

const EXAMPLES = [
  'Собрать лендинг для валидации',
  'Настроить оплату Stripe',
  'Онбординг для первых юзеров',
];

type Phase = 'idle' | 'thinking' | 'typing' | 'done';

export function DemoCard() {
  const [text, setText] = useState(EXAMPLES[2]);
  const [column, setColumn] = useState<ColumnKey>('idea');
  const [run, setRun] = useState<AgentRun | null>(null);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!run) return;
    setTyped('');
    setPhase('typing');
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(run.comment.slice(0, i));
      if (i >= run.comment.length) {
        clearInterval(id);
        setPhase('done');
      }
    }, 16);
    return () => clearInterval(id);
  }, [run]);

  function handoff() {
    const result = buildAgentRun(text);
    setPhase('thinking');
    const t = setTimeout(() => {
      setRun(result);
      setColumn(result.to);
    }, 600);
    timers.current.push(t);
  }

  function revert() {
    setRun(null);
    setTyped('');
    setPhase('idle');
    setColumn('idea');
  }

  return (
    <div id="demo" className="relative flex h-full w-full items-center overflow-y-auto bg-card/30 px-6 py-16">      <div data-fade-on-scroll className="mx-auto w-full max-w-2xl">
        <div className="mx-auto mb-8 max-w-xl text-center">
          <h2 className="text-balance font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Посмотри, как агент двигает стартап
          </h2>
        </div>

        <div className="border border-border bg-card">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Карточка · колонка:</span>
              <span data-testid="card-column" className="border border-border px-2 py-0.5 text-xs font-medium text-primary">
                {column}
              </span>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Опиши идею…"
              className="mt-3 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
            />

            <div className="mt-1 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setText(ex); revert(); }}
                  className="border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Пример {i + 1}
                </button>
              ))}
            </div>

            {phase !== 'idle' && (
              <div className="mt-5 border-t border-border pt-5">
                <div className="bg-primary/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center bg-primary text-xs font-semibold text-primary-foreground">A</div>
                    <span className="text-sm font-medium">Агент</span>
                    <span className="text-xs text-muted-foreground">· комментарий</span>
                  </div>
                  <p data-testid="agent-comment" className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {phase === 'thinking' ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Sparkles className="size-3.5 animate-pulse" /> Агент думает…
                      </span>
                    ) : (
                      <>
                        {typed}
                        {phase === 'typing' && <span className="ml-0.5 inline-block w-1.5 animate-pulse">▍</span>}
                      </>
                    )}
                  </p>
                  {run && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {run.labels.map((l) => (
                        <span key={l} className="border border-border px-2 py-0.5 text-xs text-muted-foreground">{l}</span>
                      ))}
                    </div>
                  )}
                </div>

                {run && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>агент переместил карточку: {run.from} → {run.to}</span>
                    <button type="button" onClick={revert} className="inline-flex items-center gap-1 hover:text-foreground">
                      <RotateCcw className="size-3.5" /> Откатить
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-border bg-muted/40 p-4">
            <Button onClick={handoff} disabled={phase === 'thinking' || phase === 'typing'}>
              <CornerDownRight className="mr-1 size-4" />
              {phase === 'thinking' || phase === 'typing' ? 'Агент работает…' : 'Отдать агенту'}
            </Button>
          </div>
        </div>
      </div>    </div>
  );
}
