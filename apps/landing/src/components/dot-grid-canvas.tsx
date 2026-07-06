import { useEffect, useRef } from 'react';

interface DotGridCanvasProps {
  className?: string;
  gap?: number;
}

// Фон Hero: сетка точек, которые постоянно переливаются по цвету от ярко-красного
// до розового (волна «дыхания») и дополнительно подсвечиваются рядом с курсором.
const RED = [255, 38, 58]; // ярко-красный
const PINK = [255, 143, 178]; // розовый (светлый конец перелива)
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

export function DotGridCanvas({ className, gap = 22 }: DotGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // jsdom / нет canvas — тихо выходим

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let width = 0;
    let height = 0;
    let left = 0;
    let top = 0;
    let raf = 0;
    const start = performance.now();

    // радиус влияния курсора и его позиция (по умолчанию — за экраном)
    const R = 170;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      left = rect.left;
      top = rect.top;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = (now - start) * 0.001;
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height * 0.42;
      for (let x = gap / 2; x < width; x += gap) {
        for (let y = gap / 2; y < height; y += gap) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const wave = Math.sin(dist * 0.012 - t * 1.6) * 0.5 + 0.5; // радиальная волна
          const drift = Math.sin((x + y) * 0.02 + t * 0.7) * 0.5 + 0.5; // диагональное «дыхание»
          const m = reduce ? 0.35 : wave * 0.6 + drift * 0.4;

          // подсветка рядом с курсором (плавный спад)
          const mdx = x - mouse.x;
          const mdy = y - mouse.y;
          const md = Math.sqrt(mdx * mdx + mdy * mdy);
          const infl = md < R ? (1 - md / R) ** 2 : 0;

          // цвет: от ярко-красного (t=0) к розовому (t=1); курсор дотягивает к розовому
          const cf = Math.min(1, m + infl * 0.7);
          const cr = lerp(RED[0], PINK[0], cf);
          const cg = lerp(RED[1], PINK[1], cf);
          const cb = lerp(RED[2], PINK[2], cf);
          const alpha = Math.min(1, 0.5 + m * 0.22 + infl * 0.35);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          const r = 1.1 + m * 1.2 + infl * 1.8;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX - left;
      mouse.y = e.clientY - top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();
    if (reduce) draw(start);
    else raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now());
    });
    ro.observe(canvas);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [gap]);

  return <canvas ref={canvasRef} data-testid="dot-grid" aria-hidden="true" className={className} />;
}
