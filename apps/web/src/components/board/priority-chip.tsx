import { PRIORITIES, type CardPriority } from '@moonga-studio/shared-types';
import { Badge } from '@/components/ui/badge';

interface PriorityChipProps {
  priority: CardPriority | null;
}

export function PriorityChip({ priority }: PriorityChipProps) {
  if (!priority) return null;
  const meta = PRIORITIES.find((p) => p.key === priority);
  if (!meta) return null;
  return (
    <Badge variant="outline" style={{ color: meta.color, borderColor: meta.color }}>
      {meta.label}
    </Badge>
  );
}
