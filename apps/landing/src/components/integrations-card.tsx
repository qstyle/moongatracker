import { Fragment, forwardRef, useRef } from 'react';
import { Bot, Send, Wrench, Server, Workflow, Radio, KeyRound, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedBeam } from '@/components/animated-beam';
import { ScrollNav } from '@/components/scroll-nav';

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(
  ({ className, children }, ref) => (
    <div ref={ref} className={cn('z-10 flex size-14 items-center justify-center border border-border bg-background shadow-sm', className)}>
      {children}
    </div>
  ),
);
Circle.displayName = 'Circle';

function Node({ label, refProp, children }: { label: string; refProp: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Circle ref={refProp}>{children}</Circle>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function IntegrationsCard() {
  const container = useRef<HTMLDivElement>(null);
  const center = useRef<HTMLDivElement>(null);
  const claude = useRef<HTMLDivElement>(null);
  const tg = useRef<HTMLDivElement>(null);
  const mcp = useRef<HTMLDivElement>(null);
  const rest = useRef<HTMLDivElement>(null);
  const n8n = useRef<HTMLDivElement>(null);
  const ws = useRef<HTMLDivElement>(null);

  const left = [claude, tg, mcp];
  const right = [rest, n8n, ws];

  return (
    <div id="integrations" className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-card/30 px-6 py-16">
      <ScrollNav dir="up" label="Назад" className="absolute inset-x-0 top-24 z-20 mx-auto w-fit" />
      <div data-fade-on-scroll className="mb-10 max-w-xl text-center">
        <h2 className="text-balance font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Твой агент работает с доской откуда угодно
        </h2>
        <p className="mt-3 text-balance text-muted-foreground">
          MCP-тулы и REST — из Claude, Telegram или своих скриптов. Токены со скоупом, живое
          обновление, каждый шаг в трейсе.
        </p>
      </div>

      <div ref={container} data-fade-on-scroll className="relative flex h-[360px] w-full max-w-2xl items-stretch justify-between px-2">
        <div className="flex flex-col justify-around py-4">
          <Node label="Claude" refProp={claude}><Bot className="size-6 text-primary" /></Node>
          <Node label="OpenClaw (Telegram)" refProp={tg}><Send className="size-6 text-sky-500" /></Node>
          <Node label="MCP" refProp={mcp}><Wrench className="size-6 text-amber-500" /></Node>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div ref={center} className="z-10 flex size-20 flex-col items-center justify-center bg-primary text-primary-foreground shadow-xl">
            <GitMerge className="size-6" />
          </div>
          <span className="mt-2 text-sm font-semibold">moongatracker</span>
        </div>

        <div className="flex flex-col justify-around py-4">
          <Node label="REST API" refProp={rest}><Server className="size-6 text-emerald-500" /></Node>
          <Node label="n8n" refProp={n8n}><Workflow className="size-6 text-rose-500" /></Node>
          <Node label="Socket.IO" refProp={ws}><Radio className="size-6 text-violet-500" /></Node>
        </div>

        {[...left, ...right].map((r, idx) => {
          const i = idx % 3;
          const curvature = i === 1 ? 0 : (i - 1) * 70;
          return (
            <Fragment key={idx}>
              <AnimatedBeam containerRef={container} fromRef={r} toRef={center} curvature={curvature} duration={2.5} delay={idx * 0.15} gradientStartColor="oklch(0.66 0.20 17)" gradientStopColor="oklch(0.514 0.222 16.935)" />
              <AnimatedBeam containerRef={container} fromRef={r} toRef={center} curvature={curvature} duration={2.5} delay={idx * 0.15 + 1.25} reverse gradientStartColor="oklch(0.66 0.20 17)" gradientStopColor="oklch(0.514 0.222 16.935)" />
            </Fragment>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound className="size-3.5" /> API-токены со скоупом и отзывом · трейс и откат каждого действия
      </div>
      <ScrollNav dir="down" label="Листайте вниз" className="absolute inset-x-0 bottom-6 z-20 mx-auto w-fit" />
    </div>
  );
}
