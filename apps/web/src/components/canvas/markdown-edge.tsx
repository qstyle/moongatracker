import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

export function MarkdownEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const label = (data as { label?: string | null } | undefined)?.label;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute flex items-center gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {label ? (
            <span className="rounded bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">
              {label}
            </span>
          ) : null}
          <button
            type="button"
            title="Удалить связь"
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ edges: [{ id }] });
            }}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-card text-[10px] leading-none text-muted-foreground ring-1 ring-border transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            ✕
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
