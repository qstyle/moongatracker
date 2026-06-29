import { CardDto } from '@moongatracker/shared-types';
import { RiDraggable } from '@remixicon/react';

export function CardTile({
  card,
  onClick,
}: {
  card: CardDto;
  onClick: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className="group relative cursor-pointer border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/30"
    >
      {/* hover accent rail */}
      <span className="absolute inset-y-0 left-0 w-[2px] bg-transparent transition-colors group-hover:bg-primary" />

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
