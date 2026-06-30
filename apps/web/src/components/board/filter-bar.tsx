import { RiSearchLine, RiCloseLine } from '@remixicon/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterState } from '../../lib/use-card-filter';

interface FilterBarProps {
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

export function FilterBar({ filter, onChange }: FilterBarProps) {
  const isActive = filter.search !== '';

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <RiSearchLine className="pointer-events-none absolute left-2 size-3 text-muted-foreground/40" />
        <Input
          type="search"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder="Поиск..."
        />
      </div>
      {isActive && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ search: '' })}>
          <RiCloseLine />
          Сбросить
        </Button>
      )}
    </div>
  );
}
