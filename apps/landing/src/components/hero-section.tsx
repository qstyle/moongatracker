import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollNav } from '@/components/scroll-nav';
import { APP_URL } from '@/lib/constants';

export function HeroCard() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent">
      <div data-fade-on-scroll className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <span className="mb-5 inline-flex items-center gap-2 border border-border px-3 py-1 text-xs text-muted-foreground">
          канбан для человека и AI-агента
        </span>
        <h1 className="text-balance font-heading text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          Канбан, где AI-агент — полноправный участник
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Идея живёт на одной карточке — от наброска до релиза. Агент читает, создаёт и двигает
          карточки через MCP, а ты видишь каждый его шаг и в один клик откатываешь.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 pl-5 pr-3 text-base">
            <a href={APP_URL}>
              <span className="text-nowrap">Начать бесплатно</span>
              <ChevronRight className="ml-1" />
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-12 px-5 text-base">
            <a href="#demo"><span className="text-nowrap">Смотреть демо</span></a>
          </Button>
        </div>
        <ScrollNav dir="down" label="Листайте вниз" className="mt-12" />
      </div>
    </div>
  );
}
