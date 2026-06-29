import { VIEWS, ViewId } from '../../lib/views';

export function ViewSwitch({
  value,
  onChange,
}: {
  value: ViewId;
  onChange: (v: ViewId) => void;
}) {
  return (
    <div className="flex divide-x divide-border border border-border">
      {VIEWS.map((v) => {
        const active = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            aria-pressed={active}
            className={
              'px-3 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ' +
              (active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground')
            }
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
