import { useEffect, useRef } from 'react';

interface DotGridCanvasProps {
  className?: string;
  gap?: number;
}

// Фон Hero: сетка точек, которые «дышат» розовыми волнами (радиальная + диагональная).
// Цвет — из токена --primary. Уважает prefers-reduced-motion.
export function DotGridCanvas({ className, gap = 30 }: DotGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // jsdom / нет canvas — тихо выходим

    const primary =
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() ||
      '#c81e5a';
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let width = 0;
    let height = 0;
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = (now - start) * 0.001;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = primary;
      const cx = width / 2;
      const cy = height * 0.42;
      for (let x = gap / 2; x < width; x += gap) {
        for (let y = gap / 2; y < height; y += gap) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const wave = Math.sin(dist * 0.012 - t * 1.6) * 0.5 + 0.5; // радиальная волна от центра
          const drift = Math.sin((x + y) * 0.02 + t * 0.7) * 0.5 + 0.5; // диагональное «дыхание»
          const m = reduce ? 0.3 : wave * 0.6 + drift * 0.4;
          ctx.globalAlpha = 0.05 + m * 0.28;
          const r = 0.9 + m * 1.4;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    if (reduce) draw(start);
    else raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now());
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [gap]);

  return <canvas ref={canvasRef} data-testid="dot-grid" aria-hidden="true" className={className} />;
}
