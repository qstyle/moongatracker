import { LabelDto } from '@moongatracker/shared-types';
import { RiSearchLine, RiCloseLine } from '@remixicon/react';
import { FilterState } from '../../lib/use-card-filter';

interface FilterBarProps {
  labels: LabelDto[];
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

export function FilterBar({ labels, filter, onChange }: FilterBarProps) {
  const isActive = filter.search !== '' || filter.labelIds.size > 0;

  function toggleLabel(id: string) {
    const next = new Set(filter.labelIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange({ ...filter, labelIds: next });
  }

  function clear() {
    onChange({ search: '', labelIds: new Set() });
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

      {labels.map((label) => {
        const active = filter.labelIds.has(label.id);
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => toggleLabel(label.id)}
            className="flex h-5 items-center border px-1.5 text-[10px] transition-colors"
            style={
              active
                ? {
                    backgroundColor: label.color,
                    borderColor: label.color,
                    color: '#fff',
                  }
                : {
                    borderColor: 'var(--border)',
                    color: 'var(--muted-foreground)',
                  }
            }
          >
            {label.name}
          </button>
        );
      })}

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
