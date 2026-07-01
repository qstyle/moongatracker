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
/** Простой без действий, после которого лок редактирования снимается автоматически. */
const IDLE_RELEASE_MS = 30 * 1000;

type DialogKind = 'create' | 'link' | null;

function CanvasInner({ projectId }: { projectId: string }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const myId = getCurrentUserId();
  const { holder, acquire, release, heartbeat } = useCanvasSocket(
    projectId,
    queryClient,
  );
  const { screenToFlowPosition } = useReactFlow();
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  const lockedByOther = !!holder && holder.userId !== myId;
  const lockStale = !!holder && Date.now() - holder.lockedAt > STALE_MS;
  // Редактирование включается автоматически при первом действии; выключается по
  // простою/уходу. Интерактив разрешён, пока холст не держит кто-то другой.
  const canEdit = !(lockedByOther && !lockStale);

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

  // Держим ли мы лок прямо сейчас (взят автоматически при последнем действии).
  const editingRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopEditing = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
    if (editingRef.current) {
      editingRef.current = false;
      release();
    }
  }, [release]);

  /**
   * Вызывается перед/вместе с любым редактирующим действием: берёт лок (если ещё
   * не держим), шлёт heartbeat и перезапускает таймер авто-снятия по простою.
   * Возвращает false, если холст сейчас редактирует кто-то другой.
   */
  const touchEditing = useCallback(() => {
    if (lockedByOther && !lockStale) return false;
    if (!editingRef.current) {
      editingRef.current = true;
      if (myId) {
        const me = members.find((m) => m.userId === myId);
        acquire({
          userId: myId,
          name: me?.name ?? me?.email ?? 'Аноним',
          color: me?.color ?? '#2563eb',
        });
      }
    } else {
      heartbeat();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopEditing, IDLE_RELEASE_MS);
    return true;
  }, [lockedByOther, lockStale, myId, members, acquire, heartbeat, stopEditing]);

  // Снять лок при размонтировании страницы.
  useEffect(() => () => stopEditing(), [stopEditing]);

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

  const openDialog = useCallback(
    (kind: DialogKind, nodeId: string) => {
      touchEditing();
      setActiveNodeId(nodeId);
      setSelectedBoardId('');
      setSelectedCardId('');
      setDialogKind(kind);
    },
    [touchEditing],
  );

  const closeDialog = useCallback(() => {
    setDialogKind(null);
    setActiveNodeId(null);
    setSelectedBoardId('');
    setSelectedCardId('');
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!activeNodeId || !selectedBoardId) return;
    touchEditing();
    await createTaskFromNode(activeNodeId, selectedBoardId);
    await invalidate();
    closeDialog();
  }, [activeNodeId, selectedBoardId, invalidate, closeDialog, touchEditing]);

  const handleLinkTask = useCallback(async () => {
    if (!activeNodeId || !selectedCardId) return;
    touchEditing();
    await linkTask(activeNodeId, selectedCardId);
    await invalidate();
    closeDialog();
  }, [activeNodeId, selectedCardId, invalidate, closeDialog, touchEditing]);

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
                  onUnlinkTask: () => {
                    touchEditing();
                    handleUnlinkTask(n.id);
                  },
                  onEditText: (text: string) => {
                    touchEditing();
                    updateNode(n.id, { text }).then(invalidate);
                  },
                  onSetColor: (color: string | null) => {
                    touchEditing();
                    updateNode(n.id, { color }).then(invalidate);
                  },
                  onDeleteNode: () => {
                    touchEditing();
                    deleteNode(n.id).then(invalidate);
                  },
                }
              : {}),
          } satisfies MarkdownNodeData,
        }),
      ),
    [
      data,
      canEdit,
      openCard,
      openDialog,
      handleUnlinkTask,
      invalidate,
      touchEditing,
    ],
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

  const addNodeAtCenter = useCallback(() => {
    if (!touchEditing()) return;
    const rect = flowWrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const center = screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    createNode(projectId, {
      x: center.x,
      y: center.y,
      text: 'Новая нода',
    }).then(invalidate);
  }, [touchEditing, screenToFlowPosition, projectId, invalidate]);

  if (isLoading) return <div className="p-6">Загрузка…</div>;

  const boardCards = selectedBoard?.columns.flatMap((c) =>
    c.cards.map((card) => ({ ...card, columnTitle: c.title })),
  ) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-2">
        <h1 className="text-sm font-semibold">Холст</h1>
        {lockedByOther && !lockStale && (
          <span
            className="ml-auto rounded px-2 py-1 text-xs text-white"
            style={{ background: holder!.color }}
          >
            {holder!.name} редактирует
          </span>
        )}
      </div>
      <div
        ref={flowWrapperRef}
        className="relative flex-1"
        onDoubleClick={(e) => {
          if (!touchEditing()) return;
          const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          createNode(projectId, { x: pos.x, y: pos.y, text: 'Новая нода' }).then(
            invalidate,
          );
        }}
      >
        {canEdit && (
          <Button
            size="sm"
            className="absolute left-4 top-4 z-10 shadow-md"
            onClick={addNodeAtCenter}
          >
            + Нода
          </Button>
        )}
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable
          fitView
          onNodeDragStop={(_, node) => {
            if (!touchEditing()) return;
            updateNode(node.id, {
              x: node.position.x,
              y: node.position.y,
            });
          }}
          onConnect={(c) => {
            if (!touchEditing()) return;
            if (c.source && c.target)
              createEdge(projectId, {
                sourceNodeId: c.source,
                targetNodeId: c.target,
              }).then(invalidate);
          }}
          onEdgesDelete={(edges) => {
            if (!touchEditing()) return;
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
