import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollNav } from '@/components/scroll-nav';
import { APP_URL } from '@/lib/constants';

const PLANS = [
  { name: 'Free', tagline: 'Для одного проекта', features: ['1 доска', '1 агент-токен', 'История активности 7 дней'] },
  { name: 'Pro', tagline: 'Для активной работы с агентом', features: ['Безлимит досок и токенов', 'Полный трейс и откат', 'Приоритетный realtime'], highlight: true },
  { name: 'Team', tagline: 'Для команды', features: ['Роли и участники', 'Общие доски', 'Поддержка (SSO — позже)'] },
];

export function PricingCard() {
  return (
    <div id="pricing" className="relative flex h-full w-full items-center overflow-y-auto bg-transparent px-6 py-16">
      <ScrollNav dir="up" label="Назад" className="absolute inset-x-0 top-24 z-20 mx-auto w-fit" />
      <div data-fade-on-scroll className="mx-auto w-full max-w-4xl">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-balance font-heading text-3xl font-semibold tracking-tight md:text-4xl">Начни бесплатно</h2>
          <p className="mt-3 text-balance text-muted-foreground">Доска, где человек и агент работают вместе. Апгрейд — когда вырастешь.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`flex flex-col border p-6 ${p.highlight ? 'border-primary' : 'border-border'}`}>
              <div className="font-heading text-lg font-semibold">{p.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.tagline}</div>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? 'default' : 'outline'} className="mt-6">
                <a href={APP_URL}>Начать</a>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <a href={APP_URL}>Создать аккаунт</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
