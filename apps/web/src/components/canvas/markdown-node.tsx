import { useEffect, useRef, useState } from 'react';
import {
  Handle,
  NodeResizer,
  NodeToolbar,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CanvasNodeData } from '@moongatracker/shared-types';

/** Колбэки, которые FlowCanvas прокидывает в node.data. */
export interface NodeCallbacks {
  onEditText?: (id: string, text: string) => void;
  onDeleteNode?: (id: string) => void;
  onResizeEnd?: (id: string) => void;
  onCreateTask?: (id: string) => void;
  onLinkTask?: (id: string) => void;
  onUnlinkTask?: (id: string) => void;
  onOpenCard?: (boardId: string, cardId: string) => void;
  canEdit?: boolean;
}

export type MarkdownNodeData = CanvasNodeData & NodeCallbacks;
export type MarkdownNodeType = Node<MarkdownNodeData, 'markdown'>;

const MD_CLASSES = [
  'max-w-none text-xs leading-relaxed text-foreground break-words',
  '[&_h1]:mb-1.5 [&_h1]:text-sm [&_h1]:font-semibold',
  '[&_h2]:mb-1 [&_h2]:mt-2 [&_h2]:text-[13px] [&_h2]:font-semibold',
  '[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-semibold',
  '[&_p]:my-1',
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4',
  '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4',
  '[&_li]:my-0.5',
  '[&_a]:text-primary [&_a]:underline',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px]',
  '[&_pre]:my-1 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground',
  '[&_table]:my-1 [&_table]:border-collapse',
  '[&_th]:border [&_th]:border-border [&_th]:px-1.5 [&_th]:py-0.5 [&_th]:text-left',
  '[&_td]:border [&_td]:border-border [&_td]:px-1.5 [&_td]:py-0.5',
  '[&_hr]:my-2 [&_hr]:border-border',
  '[&_img]:max-w-full',
].join(' ');

const handleStyle = { width: 10, height: 10 };

export function MarkdownNode({ id, data, selected }: NodeProps<MarkdownNodeType>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text ?? '');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = data.canEdit !== false;

  useEffect(() => {
    if (editing) {
      setDraft(data.text ?? '');
      requestAnimationFrame(() => taRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function saveEdit() {
    data.onEditText?.(id, draft);
    setEditing(false);
  }

  const card = data.card;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border bg-card shadow-sm">
      {canEdit && (
        <NodeResizer
          isVisible={!!selected}
          minWidth={160}
          minHeight={90}
          onResizeEnd={() => data.onResizeEnd?.(id)}
        />
      )}

      {canEdit && (
        <NodeToolbar isVisible={!!selected} position={Position.Top}>
          <div className="flex items-center gap-1 rounded-md border bg-card p-1 shadow-md">
            <button
              type="button"
              title="Редактировать текст"
              className="flex h-6 w-6 items-center justify-center rounded text-xs hover:bg-muted"
              onClick={() => setEditing(true)}
            >
              ✎
            </button>
            <button
              type="button"
              title="Удалить ноду"
              className="flex h-6 w-6 items-center justify-center rounded text-xs text-destructive hover:bg-destructive/10"
              onClick={() => data.onDeleteNode?.(id)}
            >
              🗑
            </button>
            <span className="mx-0.5 h-4 w-px bg-border" />
            {card ? (
              <>
                <button
                  type="button"
                  title={`Открыть карточку: ${card.title}`}
                  className="flex h-6 max-w-[160px] items-center gap-1 rounded bg-primary/10 px-1.5 text-[11px] text-primary hover:bg-primary/20"
                  onClick={() => data.onOpenCard?.(card.boardId, card.id)}
                >
                  <span className="truncate">🔗 {card.title}</span>
                </button>
                <button
                  type="button"
                  title="Отвязать задачу"
                  className="flex h-6 items-center rounded px-1.5 text-[11px] hover:bg-muted"
                  onClick={() => data.onUnlinkTask?.(id)}
                >
                  Отвязать
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  title="Создать задачу из ноды"
                  className="flex h-6 items-center rounded px-1.5 text-[11px] hover:bg-muted"
                  onClick={() => data.onCreateTask?.(id)}
                >
                  + Задача
                </button>
                <button
                  type="button"
                  title="Привязать существующую карточку"
                  className="flex h-6 items-center rounded px-1.5 text-[11px] hover:bg-muted"
                  onClick={() => data.onLinkTask?.(id)}
                >
                  Привязать
                </button>
              </>
            )}
          </div>
        </NodeToolbar>
      )}

      <Handle type="target" position={Position.Left} style={handleStyle} />

      {editing ? (
        <div className="flex flex-1 flex-col gap-1 p-2">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setEditing(false);
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                saveEdit();
              }
            }}
            className="nodrag nowheel min-h-0 flex-1 resize-none rounded border bg-background p-1.5 font-mono text-xs outline-none"
            placeholder="Текст в формате Markdown…"
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              className="rounded px-2 py-0.5 text-[11px] hover:bg-muted"
              onClick={() => setEditing(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground hover:bg-primary/80"
              onClick={saveEdit}
            >
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <div className="nowheel min-h-0 flex-1 overflow-auto p-3">
          {data.text?.trim() ? (
            <div className={MD_CLASSES}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.text}</ReactMarkdown>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Пустая нода</span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}
