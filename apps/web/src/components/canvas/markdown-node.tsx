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
      {data.card && (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            data.onOpenCard(data.card!);
          }}
        >
          🗂 {data.card.title} · {data.card.columnTitle}
        </button>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
