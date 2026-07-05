import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { Children, ReactNode, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface StickyCardStackProps {
  children: ReactNode;
  className?: string;
  cardClassName?: string;
}

export function StickyCardStack({
  children,
  className,
  cardClassName,
}: StickyCardStackProps) {
  const container = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cards = Children.toArray(children);
  const lenis = useLenis();

  // Синхронизация Lenis (плавный скролл) с ScrollTrigger — чтобы снап работал ровно
  useEffect(() => {
    if (!lenis) return;
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(raf);
    };
  }, [lenis]);

  // Дискретная навигация: один жест = ровно один переход (даже при сильном флике)
  useEffect(() => {
    if (!lenis) return;
    const total = cards.length;
    if (total <= 1) return;

    let locked = false;
    const clamp = (n: number) => Math.max(0, Math.min(total - 1, n));

    const go = (dir: number) => {
      if (locked) return;
      const vh = window.innerHeight;
      const cur = Math.round(window.scrollY / vh);
      const target = clamp(cur + dir);
      if (target === cur) return;
      locked = true;
      lenis.scrollTo(target * vh, {
        duration: 0.9,
        lock: true,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        onComplete: () => {
          window.setTimeout(() => {
            locked = false;
          }, 150);
        },
      });
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) return;
      go(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 40) go(dy > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [lenis, cards.length]);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const els = cardRefs.current;
      const total = els.length;
      if (!els[0]) return;

      gsap.set(els[0], { y: "0%", scale: 1, rotation: 0 });
      for (let i = 1; i < total; i++) {
        if (els[i]) gsap.set(els[i], { y: "100%", scale: 1, rotation: 0 });
      }

      // Контент карточки виден только когда она активна
      const contentOf = (el: HTMLDivElement) =>
        el.querySelectorAll<HTMLElement>("[data-fade-on-scroll]");
      els.forEach((el, k) => {
        if (!el) return;
        gsap.set(contentOf(el), {
          autoAlpha: k === 0 ? 1 : 0,
          y: k === 0 ? 0 : 24,
        });
      });

      // Одна карточка = один экран прокрутки
      const perCard = window.innerHeight;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".sticky-cards",
          start: "top top",
          end: `+=${perCard * (total - 1)}`,
          pin: true,
          scrub: 0.6,
          pinSpacing: true,
        },
      });

      for (let i = 0; i < total - 1; i++) {
        const cur = els[i];
        const next = els[i + 1];
        if (!cur || !next) continue;

        // Уходящая карточка НЕ сжимается — остаётся во всю ширину,
        // следующая просто наезжает сверху.
        tl.to(next, { y: "0%", duration: 1, ease: "none" }, i);

        // Уходящая карточка: контент прячется в начале прокрутки
        const outEls = contentOf(cur);
        if (outEls.length) {
          tl.to(
            outEls,
            { autoAlpha: 0, y: -24, duration: 0.3, ease: "power1.out" },
            i,
          );
        }
        // Приходящая карточка: контент появляется почти мгновенно при докрутке
        const inEls = contentOf(next);
        if (inEls.length) {
          tl.to(
            inEls,
            { autoAlpha: 1, y: 0, duration: 0.12, ease: "power1.out" },
            i + 0.12,
          );
        }
      }

      const ro = new ResizeObserver(() => ScrollTrigger.refresh());
      if (container.current) ro.observe(container.current);

      return () => {
        ro.disconnect();
        tl.kill();
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    },
    { scope: container },
  );

  return (
    <div className={cn("relative h-full w-full", className)} ref={container}>
      <div className="sticky-cards relative flex h-screen w-full items-center justify-center overflow-hidden">
        <div className="relative h-full w-full">
          {cards.map((child, i) => (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={cn(
                "absolute inset-0 h-full w-full overflow-hidden shadow-2xl shadow-black/20",
                cardClassName,
              )}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
