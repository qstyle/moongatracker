import { CardDto } from '@moongatracker/shared-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RiAttachment2, RiDraggable } from '@remixicon/react';
import { PriorityChip } from './priority-chip';

export function CardTile({
  card,
  disabled,
  onClick,
}: {
  card: CardDto;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled });

  const stripe =
    card.priority === 'urgent' ? '#e11d48'
    : card.priority === 'normal' ? '#f59e0b'
    : card.priority === 'low' ? '#64748b'
    : 'transparent';

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(disabled ? {} : listeners)}
      onClick={onClick}
      className={
        'group relative touch-none border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/30 ' +
        (disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing')
      }
    >
      <div className="absolute inset-y-0 left-0 w-0.5 transition-colors" style={{ backgroundColor: stripe }} />

      {card.priority && (
        <div className="mb-1.5">
          <PriorityChip priority={card.priority} />
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="flex-1 text-sm font-medium leading-snug text-card-foreground">
          {card.title}
        </div>
        {!disabled && (
          <RiDraggable
            aria-hidden
            className="mt-px size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>

      {card.body && (
        <div className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {card.body}
        </div>
      )}

      {card.attachmentCount > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <RiAttachment2 className="size-3" />
          <div>{card.attachmentCount}</div>
        </div>
      )}
    </div>
  );
}
