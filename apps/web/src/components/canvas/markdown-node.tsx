import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { LinkedCardDto } from '@moongatracker/shared-types';

export interface MarkdownNodeData extends Record<string, unknown> {
  text: string;
  color: string | null;
  card: LinkedCardDto | null;
  editable: boolean;
  onOpenCard: (card: LinkedCardDto) => void;
  onCreateTask?: () => void;
  onLinkTask?: () => void;
  onUnlinkTask?: () => void;
}

export type MarkdownNodeType = Node<MarkdownNodeData, 'markdown'>;

export function MarkdownNode({ data }: NodeProps<MarkdownNodeType>) {
  return (
    <div
      className="rounded-md border bg-card p-3 shadow-sm text-sm"
      style={{ borderColor: data.color ?? undefined, width: '100%', height: '100%' }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="prose-sm max-w-none [&_p]:my-1 [&_h1]:text-base [&_h1]:font-semibold [&_ul]:list-disc [&_ul]:pl-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.text || '_пусто_'}</ReactMarkdown>
      </div>
      {data.card ? (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenCard(data.card!);
            }}
          >
            🗂 {data.card.title} · {data.card.columnTitle}
          </button>
          {data.editable && data.onUnlinkTask && (
            <button
              type="button"
              className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              title="Отвязать задачу"
              onClick={(e) => {
                e.stopPropagation();
                data.onUnlinkTask!();
              }}
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        data.editable && (
          <div className="mt-2 flex items-center gap-1">
            {data.onCreateTask && (
              <button
                type="button"
                className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onCreateTask!();
                }}
              >
                + Задача
              </button>
            )}
            {data.onLinkTask && (
              <button
                type="button"
                className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onLinkTask!();
                }}
              >
                Привязать
              </button>
            )}
          </div>
        )
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
