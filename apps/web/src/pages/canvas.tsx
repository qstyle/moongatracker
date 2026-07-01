import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCurrentUserId } from '../api/client';
import { useCanvasSocket } from '../api/socket';
import {
  fetchCanvas,
  seedCanvas,
  createNode,
  updateNode,
  createEdge,
  deleteNode,
  deleteEdge,
  createTaskFromNode,
  linkTask,
  unlinkTask,
} from '../api/canvas';
import { fetchBoards, fetchBoard } from '../api/boards';
import { fetchProjectMembers } from '../api/projects';
import {
  MarkdownNode,
  type MarkdownNodeData,
  type MarkdownNodeType,
} from '../components/canvas/markdown-node';
import type { LinkedCardDto } from '@moongatracker/shared-types';

const nodeTypes = { markdown: MarkdownNode };

const STALE_MS = 2 * 60 * 1000;

type DialogKind = 'create' | 'link' | null;

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
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  const lockedByOther = !!holder && holder.userId !== myId;
  const lockStale = !!holder && Date.now() - holder.lockedAt > STALE_MS;
  const canEdit = editing && !(lockedByOther && !lockStale);

  // Dialog state
  const [dialogKind, setDialogKind] = useState<DialogKind>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['canvas', projectId],
    queryFn: () => fetchCanvas(projectId),
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => fetchBoards(projectId),
    enabled: !!projectId && dialogKind !== null,
  });

  const { data: selectedBoard } = useQuery({
    queryKey: ['board', selectedBoardId],
    queryFn: () => fetchBoard(selectedBoardId),
    enabled: !!selectedBoardId && dialogKind === 'link',
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

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['canvas', projectId] }),
    [queryClient, projectId],
  );

  const openDialog = useCallback((kind: DialogKind, nodeId: string) => {
    setActiveNodeId(nodeId);
    setSelectedBoardId('');
    setSelectedCardId('');
    setDialogKind(kind);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogKind(null);
    setActiveNodeId(null);
    setSelectedBoardId('');
    setSelectedCardId('');
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!activeNodeId || !selectedBoardId) return;
    await createTaskFromNode(activeNodeId, selectedBoardId);
    await invalidate();
    closeDialog();
  }, [activeNodeId, selectedBoardId, invalidate, closeDialog]);

  const handleLinkTask = useCallback(async () => {
    if (!activeNodeId || !selectedCardId) return;
    await linkTask(activeNodeId, selectedCardId);
    await invalidate();
    closeDialog();
  }, [activeNodeId, selectedCardId, invalidate, closeDialog]);

  const handleUnlinkTask = useCallback(
    async (nodeId: string) => {
      await unlinkTask(nodeId);
      await invalidate();
    },
    [invalidate],
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
            ...(canEdit
              ? {
                  onCreateTask: () => openDialog('create', n.id),
                  onLinkTask: () => openDialog('link', n.id),
                  onUnlinkTask: () => handleUnlinkTask(n.id),
                  onEditText: (text: string) =>
                    updateNode(n.id, { text }).then(invalidate),
                  onSetColor: (color: string | null) =>
                    updateNode(n.id, { color }).then(invalidate),
                  onDeleteNode: () => deleteNode(n.id).then(invalidate),
                }
              : {}),
          } satisfies MarkdownNodeData,
        }),
      ),
    [data, canEdit, openCard, openDialog, handleUnlinkTask, invalidate],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      (data?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.label ?? undefined,
        deletable: canEdit,
      })),
    [data, canEdit],
  );

  const onEdit = async () => {
    if (!myId) return;
    const me = members.find((m) => m.userId === myId);
    const name = me?.name ?? me?.email ?? 'Аноним';
    const color = me?.color ?? '#2563eb';
    const ok = await acquire({ userId: myId, name, color });
    setEditing(ok);
  };

  const onDone = () => {
    release();
    setEditing(false);
  };

  if (isLoading) return <div className="p-6">Загрузка…</div>;

  const boardCards = selectedBoard?.columns.flatMap((c) =>
    c.cards.map((card) => ({ ...card, columnTitle: c.title })),
  ) ?? [];

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
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const rect = flowWrapperRef.current?.getBoundingClientRect();
                if (!rect) return;
                const center = screenToFlowPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                });
                createNode(projectId, { x: center.x, y: center.y, text: 'Новая нода' }).then(invalidate);
              }}
            >
              + Нода
            </Button>
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
        ref={flowWrapperRef}
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
          onEdgesDelete={(edges) => {
            if (canEdit)
              Promise.all(edges.map((e) => deleteEdge(e.id))).then(invalidate);
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Create task dialog */}
      <Dialog open={dialogKind === 'create'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать задачу</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">Выберите доску, в которой будет создана задача из этой ноды.</p>
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите доску…" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Отмена</Button>
            <Button disabled={!selectedBoardId} onClick={handleCreateTask}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link task dialog */}
      <Dialog open={dialogKind === 'link'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Привязать задачу</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Доска</p>
              <Select value={selectedBoardId} onValueChange={(v) => { setSelectedBoardId(v); setSelectedCardId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите доску…" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBoardId && (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Карточка</p>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите карточку…" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.title} · {card.columnTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Отмена</Button>
            <Button disabled={!selectedCardId} onClick={handleLinkTask}>Привязать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
