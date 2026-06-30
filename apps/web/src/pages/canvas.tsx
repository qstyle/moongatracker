import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { getCurrentUserId } from '../api/client';
import { useCanvasSocket } from '../api/socket';
import {
  fetchCanvas,
  seedCanvas,
  createNode,
  updateNode,
  createEdge,
} from '../api/canvas';
import {
  MarkdownNode,
  type MarkdownNodeData,
  type MarkdownNodeType,
} from '../components/canvas/markdown-node';
import type { LinkedCardDto } from '@moongatracker/shared-types';

const nodeTypes = { markdown: MarkdownNode };

const STALE_MS = 2 * 60 * 1000;

function CanvasInner({ projectId }: { projectId: string }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const myId = getCurrentUserId();
  const { holder, acquire, release, heartbeat } = useCanvasSocket(
    projectId,
    queryClient,
  );
  const [editing, setEditing] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const lockedByOther = !!holder && holder.userId !== myId;
  const lockStale = !!holder && Date.now() - holder.lockedAt > STALE_MS;
  const canEdit = editing && !(lockedByOther && !lockStale);

  const { data, isLoading } = useQuery({
    queryKey: ['canvas', projectId],
    queryFn: () => fetchCanvas(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (data && data.nodes.length === 0) {
      seedCanvas(projectId).then(() =>
        queryClient.invalidateQueries({ queryKey: ['canvas', projectId] }),
      );
    }
  }, [data, projectId, queryClient]);

  useEffect(() => {
    if (!canEdit) return;
    const t = setInterval(heartbeat, 30000);
    return () => clearInterval(t);
  }, [canEdit, heartbeat]);

  const openCard = useCallback(
    (card: LinkedCardDto) => {
      navigate(`/boards/${card.boardId}/cards/${card.id}`);
    },
    [navigate],
  );

  const rfNodes: Node[] = useMemo(
    () =>
      (data?.nodes ?? []).map(
        (n): MarkdownNodeType => ({
          id: n.id,
          type: 'markdown',
          position: { x: n.x, y: n.y },
          width: n.width,
          height: n.height,
          draggable: canEdit,
          data: {
            text: n.text,
            color: n.color,
            card: n.card,
            editable: canEdit,
            onOpenCard: openCard,
          } satisfies MarkdownNodeData,
        }),
      ),
    [data, canEdit, openCard],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      (data?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.label ?? undefined,
      })),
    [data],
  );

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['canvas', projectId] }),
    [queryClient, projectId],
  );

  const onEdit = async () => {
    if (!myId) return;
    const ok = await acquire({ userId: myId, name: 'Вы', color: '#2563eb' });
    setEditing(ok);
  };

  const onDone = () => {
    release();
    setEditing(false);
  };

  if (isLoading) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-2">
        <h1 className="text-sm font-semibold">Холст</h1>
        <div className="ml-auto flex items-center gap-2">
          {lockedByOther && !lockStale && (
            <span
              className="rounded px-2 py-1 text-xs text-white"
              style={{ background: holder!.color }}
            >
              {holder!.name} редактирует
            </span>
          )}
          {!editing ? (
            <Button
              size="sm"
              onClick={onEdit}
              disabled={lockedByOther && !lockStale}
            >
              {lockedByOther && lockStale ? 'Перехватить' : 'Редактировать'}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={onDone}>
              Готово
            </Button>
          )}
        </div>
      </div>
      <div
        className="flex-1"
        onDoubleClick={(e) => {
          if (!canEdit) return;
          const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          createNode(projectId, { x: pos.x, y: pos.y, text: 'Новая нода' }).then(
            invalidate,
          );
        }}
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable
          fitView
          onNodeDragStop={(_, node) => {
            if (canEdit)
              updateNode(node.id, {
                x: node.position.x,
                y: node.position.y,
              });
          }}
          onConnect={(c) => {
            if (canEdit && c.source && c.target)
              createEdge(projectId, {
                sourceNodeId: c.source,
                targetNodeId: c.target,
              }).then(invalidate);
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

export function CanvasPage() {
  const [, params] = useRoute('/projects/:projectId/canvas');
  const projectId = params?.projectId ?? '';
  if (!projectId) return null;
  return (
    <ReactFlowProvider>
      <CanvasInner projectId={projectId} />
    </ReactFlowProvider>
  );
}
