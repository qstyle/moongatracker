import { useEffect, useState } from 'react';
import { ScrollNav } from '@/components/scroll-nav';

// Единая навигация: одна и та же на всех экранах, но «Назад» скрыта на первом,
// а «Листайте вниз» — на последнем. Текущий экран считается как scrollY / высота экрана
// (та же логика, что и внутри ScrollNav).
export function StackNav({ total }: { total: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const update = () =>
      setIndex(Math.round(window.scrollY / (window.innerHeight || 1)));
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const isFirst = index <= 0;
  const isLast = index >= total - 1;

  return (
    <>
      {!isFirst && (
        <ScrollNav
          dir="up"
          label="Назад"
          className="fixed inset-x-0 top-24 z-30 mx-auto w-fit"
        />
      )}
      {!isLast && (
        <ScrollNav
          dir="down"
          label="Листайте вниз"
          className="fixed inset-x-0 bottom-6 z-30 mx-auto w-fit"
        />
      )}
    </>
  );
}
