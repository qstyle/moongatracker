import { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { LinkedCardDto } from '@moongatracker/shared-types';
import { MEMBER_COLOR_PALETTE } from '@moongatracker/shared-types';

export interface MarkdownNodeData extends Record<string, unknown> {
  text: string;
  color: string | null;
  card: LinkedCardDto | null;
  editable: boolean;
  onOpenCard: (card: LinkedCardDto) => void;
  onCreateTask?: () => void;
  onLinkTask?: () => void;
  onUnlinkTask?: () => void;
  onEditText?: (text: string) => void;
  onSetColor?: (color: string | null) => void;
  onDeleteNode?: () => void;
}

export type MarkdownNodeType = Node<MarkdownNodeData, 'markdown'>;

export function MarkdownNode({ data }: NodeProps<MarkdownNodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when text changes externally (after save)
  useEffect(() => {
    if (!isEditing) {
      setDraft(data.text);
    }
  }, [data.text, isEditing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(data.text);
    setIsEditing(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onEditText?.(draft);
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(data.text);
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Удалить ноду?')) {
      data.onDeleteNode?.();
    }
  };

  return (
    <div
      className="rounded-md border bg-card p-3 shadow-sm text-sm"
      style={{ borderColor: data.color ?? undefined, width: '100%', height: '100%' }}
    >
      <Handle type="target" position={Position.Left} />

      {/* Toolbar: only in editable mode */}
      {data.editable && !isEditing && (
        <div className="mb-1.5 flex items-center gap-1 flex-wrap">
          {/* Color swatches */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* No-color option */}
            <button
              type="button"
              title="Без цвета"
              className="w-4 h-4 rounded-full border border-muted-foreground/30 bg-card hover:border-muted-foreground transition-colors flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                data.onSetColor?.(null);
              }}
            >
              <span className="text-[8px] text-muted-foreground leading-none">✕</span>
            </button>
            {MEMBER_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: data.color === c ? '#000' : 'transparent',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  data.onSetColor?.(c);
                }}
              />
            ))}
          </div>
          {/* Edit text button */}
          <button
            type="button"
            title="Редактировать текст"
            className="ml-auto inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleEditStart}
          >
            ✎
          </button>
          {/* Delete button */}
          <button
            type="button"
            title="Удалить ноду"
            className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          >
            🗑
          </button>
        </div>
      )}

      {/* Body: edit mode vs view mode */}
      {isEditing ? (
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            className="nodrag w-full rounded border bg-background p-1.5 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              // Ctrl+Enter / Cmd+Enter to save
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                data.onEditText?.(draft);
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setDraft(data.text);
                setIsEditing(false);
              }
            }}
          />
          <div className="flex gap-1">
            <button
              type="button"
              className="inline-flex items-center rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={handleSave}
            >
              Сохранить
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleCancel}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="prose-sm max-w-none [&_p]:my-1 [&_h1]:text-base [&_h1]:font-semibold [&_ul]:list-disc [&_ul]:pl-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.text || '_пусто_'}</ReactMarkdown>
        </div>
      )}

      {/* Linked card badge */}
      {!isEditing && (
        <>
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
        </>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
