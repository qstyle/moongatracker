import { useEffect, useRef } from 'react';

interface CardDriftCanvasProps {
  className?: string;
  count?: number;
}

interface DriftCard {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  alpha: number;
}

// Фон Hero: полупрозрачные канбан-карточки медленно всплывают вверх (idea → done).
// Цвет берётся из токена --primary. Острые углы под стиль moongatracker (--radius: 0).
export function CardDriftCanvas({ className, count = 14 }: CardDriftCanvasProps) {
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
    let cards: DriftCard[] = [];
    let raf = 0;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const spawn = (initial: boolean): DriftCard => {
      const w = rand(120, 200);
      const h = rand(64, 108);
      return {
        x: rand(0, Math.max(1, width - w)),
        y: initial ? rand(0, Math.max(1, height)) : height + rand(20, 220),
        w,
        h,
        speed: rand(0.12, 0.4),
        alpha: rand(0.04, 0.1),
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!cards.length) cards = Array.from({ length: count }, () => spawn(true));
    };

    const drawCard = (c: DriftCard) => {
      // тело карточки (очень слабая заливка)
      ctx.globalAlpha = c.alpha;
      ctx.fillStyle = primary;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      // острая рамка
      ctx.globalAlpha = Math.min(1, c.alpha * 2.4);
      ctx.strokeStyle = primary;
      ctx.lineWidth = 1;
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
      // верхний акцент-бар
      ctx.globalAlpha = Math.min(1, c.alpha * 3);
      ctx.fillRect(c.x, c.y, c.w, 4);
      // строки-«контент»
      ctx.globalAlpha = Math.min(1, c.alpha * 1.8);
      ctx.fillRect(c.x + 12, c.y + 20, c.w * 0.55, 4);
      ctx.fillRect(c.x + 12, c.y + 32, c.w * 0.35, 4);
    };

    const frame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const c of cards) {
        if (!reduce) {
          c.y -= c.speed;
          if (c.y + c.h < 0) Object.assign(c, spawn(false));
        }
        drawCard(c);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    frame();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count]);

  return <canvas ref={canvasRef} data-testid="card-drift" aria-hidden="true" className={className} />;
}
