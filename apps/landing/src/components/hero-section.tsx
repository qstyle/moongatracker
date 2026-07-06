import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { REGISTER_URL } from '@/lib/constants';

export function HeroCard() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-card/30">
      <div data-fade-on-scroll className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <span className="mb-5 inline-flex items-center gap-2 border border-border px-3 py-1 text-xs text-muted-foreground">
          твоя студия стартапов
        </span>
        <h1 className="text-balance font-heading text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          Место, где стартап рождается и доходит до запуска
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Идея, роадмап, задачи, вики и агент — всё в одной студии. От первого наброска
          до релиза — без хаоса в десятке вкладок.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 pl-5 pr-3 text-base">
            <a href={REGISTER_URL}>
              <span className="text-nowrap">Начать бесплатно</span>
              <ChevronRight className="ml-1" />
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-12 px-5 text-base">
            <a href="#demo"><span className="text-nowrap">Смотреть демо</span></a>
          </Button>
        </div>      </div>
    </div>
  );
}
