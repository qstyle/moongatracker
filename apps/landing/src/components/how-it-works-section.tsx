import { Lightbulb, Search, GitBranch, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { icon: Lightbulb, title: 'Заводишь стартап', text: 'Одна идея → студия раскладывает её в роадмап стадий.' },
  { icon: GitBranch, title: 'Стадии → доски', text: 'Каждый этап пути становится доской с задачами.' },
  { icon: Search, title: 'Задачи в работе', text: 'Открыто, в работе, готово — прогресс виден по каждой стадии.' },
  { icon: CheckCircle2, title: 'До запуска', text: 'Продвигаешь стадии, пока стартап не выйдет в прод.' },
];

export function HowItWorksCard() {
  return (
    <div id="how" className="relative flex h-full w-full items-center overflow-y-auto bg-card/30 px-6 py-16">      <div data-fade-on-scroll className="mx-auto w-full max-w-4xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Стартап живёт как роадмап
          </h2>
          <p className="mt-3 text-balance text-muted-foreground">
            Одна дорога: <code className="text-foreground">идея → валидация → дизайн → сборка → запуск</code>.
            Каждая стадия — доска, разбитая на задачи.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} data-testid="how-step" className="border border-border bg-background p-5">
              <div className="flex items-center gap-2 text-primary">
                <s.icon className="size-5" />
                <span className="text-xs text-muted-foreground">Шаг {i + 1}</span>
              </div>
              <div className="mt-3 font-heading font-semibold">{s.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>    </div>
  );
}
