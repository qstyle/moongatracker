import { RiSearchLine, RiCloseLine } from '@remixicon/react';
import { FilterState } from '../../lib/use-card-filter';

interface FilterBarProps {
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

export function FilterBar({ filter, onChange }: FilterBarProps) {
  const isActive = filter.search !== '';

  function clear() {
    onChange({ search: '' });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <RiSearchLine className="pointer-events-none absolute left-2 size-3 text-muted-foreground/40" />
        <input
          type="search"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder="Поиск..."
          className="h-6 w-32 border border-border bg-transparent pl-6 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:border-foreground/30 focus:outline-none"
        />
      </div>

      {isActive && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <RiCloseLine className="size-3" />
          Сбросить
        </button>
      )}
    </div>
  );
}
