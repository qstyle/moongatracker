export function LabelChip({
  name,
  color,
  onRemove,
}: {
  name: string;
  color: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-[10px] leading-none text-foreground">
      <span className="size-2 shrink-0" style={{ backgroundColor: color }} />
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`убрать метку ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
