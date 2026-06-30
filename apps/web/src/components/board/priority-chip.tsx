import { PRIORITIES, type CardPriority } from '@moongatracker/shared-types';

interface PriorityChipProps {
  priority: CardPriority | null;
}

export function PriorityChip({ priority }: PriorityChipProps) {
  if (!priority) return null;
  const meta = PRIORITIES.find((p) => p.key === priority);
  if (!meta) return null;
  return (
    <span
      style={{ color: meta.color }}
      className="text-[10px] font-semibold uppercase tracking-wider"
    >
      {meta.label}
    </span>
  );
}
