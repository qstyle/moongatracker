import { CardDto } from '@moongatracker/shared-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RiDraggable } from '@remixicon/react';
import { LabelChip } from './label-chip';

export function CardTile({
  card,
  onClick,
}: {
  card: CardDto;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group relative cursor-grab touch-none border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/30 active:cursor-grabbing"
    >
      <span className="absolute inset-y-0 left-0 w-[2px] bg-transparent transition-colors group-hover:bg-primary" />

      {card.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <LabelChip key={l.id} name={l.name} color={l.color} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <p className="flex-1 text-[13px] font-medium leading-snug text-card-foreground">
          {card.title}
        </p>
        <RiDraggable
          aria-hidden
          className="mt-px size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      {card.body && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {card.body}
        </p>
      )}
    </article>
  );
}
