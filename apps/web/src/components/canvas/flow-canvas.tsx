import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type OnConnectEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type {
  CanvasNodeData,
  LinkedCardDto,
} from '@moonga-studio/shared-types';

import { fetchCanvas, saveCanvas, createTaskFromNode } from '../../api/canvas';
import { fetchProjectMembers } from '../../api/projects';
import { fetchBoards, fetchBoard } from '../../api/boards';
import { getCurrentUserId } from '../../api/client';
import { useCanvasSocket } from '../../api/socket';
import { useUndoRedo } from '../../hooks/use-undo-redo';
import { layout } from '../../lib/canvas-layout';
import { useTheme } from '../../lib/use-theme';
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
import {
  MarkdownNode,
  type MarkdownNodeData,
  type MarkdownNodeType,
} from './markdown-node';
import { MarkdownEdge } from './markdown-edge';

const nodeTypes = { markdown: MarkdownNode };
const edgeTypes = { markdown: MarkdownEdge };
const snapGrid: [number, number] = [16, 16];
const deleteKeyCode = ['Backspace', 'Delete'];
const panOnDrag = [1, 2];

const DEFAULT_W = 240;
const DEFAULT_H = 140;
const LOCK_TTL = 120_000;
const IDLE_MS = 30_000;
const SAVE_DEBOUNCE = 800;

interface DialogState {
  kind: 'create' | 'link';
  nodeId: string;
}

export function FlowCanvas({ projectId }: { projectId: string }) {
  const rf = useReactFlow<MarkdownNodeType, Edge>();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [, navigate] = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<MarkdownNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { holder, acquire, release, heartbeat } = useCanvasSocket(
    projectId,
    queryClient,
  );
  const myId = getCurrentUserId();

  const { data: members = [] } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
  });
  const me = useMemo(
    () => members.find((m) => m.userId === myId) ?? null,
    [members, myId],
  );

  const lockedByOther =
    !!holder && holder.userId !== myId && Date.now() - holder.lockedAt < LOCK_TTL;
  const canEdit = !lockedByOther;

  // --- Soft-lock editing session ---------------------------------------
  const editingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  const stopEditing = useCallback(() => {
    if (editingRef.current) {
      editingRef.current = false;
      release();
    }
  }, [release]);

  const touchEditing = useCallback((): boolean => {
    if (!canEditRef.current) return false;
    if (!editingRef.current) {
      editingRef.current = true;
      acquire({
        userId: myId ?? 'anon',
        name: me?.name || me?.email || 'Аноним',
        color: me?.color || '#2563eb',
      });
    } else {
      heartbeat();
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopEditing, IDLE_MS);
    return true;
  }, [acquire, heartbeat, stopEditing, myId, me]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      stopEditing();
    };
  }, [stopEditing]);

  // --- Autosave (gated to lock-held) -----------------------------------
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!editingRef.current) return; // only save while we hold the lock
      const doc = rf.toObject();
      // Не отправляем внедрённые колбэки/резолвнутую карточку в data.card.
      const clean = {
        nodes: doc.nodes.map((n) => ({
          ...n,
          data: stripNodeData(n.data as MarkdownNodeData),
        })),
        edges: doc.edges,
        viewport: doc.viewport,
      };
      saveCanvas(projectId, clean).catch(() => undefined);
    }, SAVE_DEBOUNCE);
  }, [rf, projectId]);

  const undoRedo = useUndoRedo(canEdit);
  const { takeSnapshot, undo, redo, canUndo, canRedo } = undoRedo;

  // --- Node data callbacks ---------------------------------------------
  const handleEditText = useCallback(
    (id: string, text: string) => {
      if (!touchEditing()) return;
      takeSnapshot();
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text } } : n)),
      );
      scheduleSave();
    },
    [touchEditing, takeSnapshot, setNodes, scheduleSave],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      if (!touchEditing()) return;
      takeSnapshot();
      rf.deleteElements({ nodes: [{ id }] });
      scheduleSave();
    },
    [touchEditing, takeSnapshot, rf, scheduleSave],
  );

  const handleResizeEnd = useCallback(
    (_id: string) => {
      if (!touchEditing()) return;
      scheduleSave();
    },
    [touchEditing, scheduleSave],
  );

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const handleCreateTask = useCallback(
    (id: string) => {
      if (!touchEditing()) return;
      setDialog({ kind: 'create', nodeId: id });
    },
    [touchEditing],
  );
  const handleLinkTask = useCallback(
    (id: string) => {
      if (!touchEditing()) return;
      setDialog({ kind: 'link', nodeId: id });
    },
    [touchEditing],
  );

  const setNodeCard = useCallback(
    (id: string, cardId: string | null, card: LinkedCardDto | null) => {
      takeSnapshot();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, cardId, card } } : n,
        ),
      );
      scheduleSave();
    },
    [takeSnapshot, setNodes, scheduleSave],
  );

  const handleUnlinkTask = useCallback(
    (id: string) => {
      if (!touchEditing()) return;
      setNodeCard(id, null, null);
    },
    [touchEditing, setNodeCard],
  );

  const handleOpenCard = useCallback(
    (boardId: string, cardId: string) => {
      navigate(`/boards/${boardId}/cards/${cardId}`);
    },
    [navigate],
  );

  // Собираем колбэки в объект-референс (стабильный) для инъекции в data.
  const callbacksRef = useRef({
    onEditText: handleEditText,
    onDeleteNode: handleDeleteNode,
    onResizeEnd: handleResizeEnd,
    onCreateTask: handleCreateTask,
    onLinkTask: handleLinkTask,
    onUnlinkTask: handleUnlinkTask,
    onOpenCard: handleOpenCard,
  });
  callbacksRef.current = {
    onEditText: handleEditText,
    onDeleteNode: handleDeleteNode,
    onResizeEnd: handleResizeEnd,
    onCreateTask: handleCreateTask,
    onLinkTask: handleLinkTask,
    onUnlinkTask: handleUnlinkTask,
    onOpenCard: handleOpenCard,
  };

  function attachCallbacks(data: CanvasNodeData): MarkdownNodeData {
    return { ...data, ...callbacksRef.current, canEdit: canEditRef.current };
  }

  // --- Initial load -----------------------------------------------------
  const { data: doc } = useQuery({
    queryKey: ['canvas', projectId],
    queryFn: () => fetchCanvas(projectId),
    enabled: !!projectId,
  });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!doc || loadedRef.current) return;
    loadedRef.current = true;
    setNodes(
      doc.nodes.map((n) => ({
        id: n.id,
        type: 'markdown' as const,
        position: n.position,
        width: n.width ?? undefined,
        height: n.height ?? undefined,
        data: attachCallbacks(n.data),
      })),
    );
    setEdges(
      doc.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'markdown',
        data: e.data,
      })),
    );
    if (doc.viewport) rf.setViewport(doc.viewport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // Держим data.canEdit в актуальном состоянии (для скрытия тулбара).
  useEffect(() => {
    if (!loadedRef.current) return;
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, canEdit } })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  // --- Node factory -----------------------------------------------------
  const makeNode = useCallback(
    (position: { x: number; y: number }): MarkdownNodeType => ({
      id: crypto.randomUUID(),
      type: 'markdown',
      position,
      width: DEFAULT_W,
      height: DEFAULT_H,
      data: attachCallbacks({ text: 'Новая нода' }),
      selected: true,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addNodeAt = useCallback(
    (position: { x: number; y: number }, connectFrom?: string) => {
      if (!touchEditing()) return;
      takeSnapshot();
      const node = makeNode(position);
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node]);
      if (connectFrom) {
        setEdges((eds) =>
          addEdge(
            {
              id: crypto.randomUUID(),
              source: connectFrom,
              target: node.id,
              type: 'markdown',
            },
            eds,
          ),
        );
      }
      scheduleSave();
    },
    [touchEditing, takeSnapshot, makeNode, setNodes, setEdges, scheduleSave],
  );

  // --- React Flow event handlers ---------------------------------------
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!touchEditing()) return;
      takeSnapshot();
      setEdges((eds) =>
        addEdge({ ...connection, id: crypto.randomUUID(), type: 'markdown' }, eds),
      );
      scheduleSave();
    },
    [touchEditing, takeSnapshot, setEdges, scheduleSave],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState: FinalConnectionState) => {
      if (connectionState.isValid) return;
      const fromNode = connectionState.fromNode;
      if (!fromNode) return;
      const point =
        'changedTouches' in event
          ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
          : { x: event.clientX, y: event.clientY };
      const position = rf.screenToFlowPosition(point);
      addNodeAt(position, fromNode.id);
    },
    [rf, addNodeAt],
  );

  const onNodeDragStart = useCallback(() => {
    if (touchEditing()) takeSnapshot();
  }, [touchEditing, takeSnapshot]);

  const onNodeDragStop = useCallback(() => {
    if (!touchEditing()) return;
    scheduleSave();
  }, [touchEditing, scheduleSave]);

  const onNodesDelete = useCallback(() => {
    if (!touchEditing()) return;
    scheduleSave();
  }, [touchEditing, scheduleSave]);

  const onEdgesDelete = useCallback(() => {
    if (!touchEditing()) return;
    scheduleSave();
  }, [touchEditing, scheduleSave]);

  const onMoveEnd = useCallback(() => {
    // Сохраняем вьюпорт только если удерживаем лок.
    if (editingRef.current) scheduleSave();
  }, [scheduleSave]);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Игнорируем даблклик по нодам/контролам/панелям.
      const target = e.target as HTMLElement;
      if (
        target.closest('.react-flow__node') ||
        target.closest('.react-flow__controls') ||
        target.closest('.react-flow__minimap') ||
        target.closest('.react-flow__panel') ||
        target.closest('button')
      )
        return;
      const position = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeAt(position);
    },
    [rf, addNodeAt],
  );

  const addNodeAtCenter = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const position = rf.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    addNodeAt(position);
  }, [rf, addNodeAt]);

  const onLayout = useCallback(() => {
    if (!touchEditing()) return;
    takeSnapshot();
    const laid = layout(rf.getNodes(), rf.getEdges()) as MarkdownNodeType[];
    setNodes(laid);
    window.requestAnimationFrame(() => rf.fitView());
    scheduleSave();
  }, [touchEditing, takeSnapshot, rf, setNodes, scheduleSave]);

  // --- Copy / paste -----------------------------------------------------
  const clipboardRef = useRef<MarkdownNodeType[]>([]);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'c') {
        const selected = rf.getNodes().filter((n) => n.selected);
        clipboardRef.current = selected.map((n) => ({ ...n, data: { ...n.data } }));
      } else if (key === 'v') {
        if (clipboardRef.current.length === 0) return;
        if (!touchEditing()) return;
        e.preventDefault();
        takeSnapshot();
        const pasted = clipboardRef.current.map((n) => ({
          ...n,
          id: crypto.randomUUID(),
          position: { x: n.position.x + 32, y: n.position.y + 32 },
          selected: true,
          data: attachCallbacks(stripNodeData(n.data)),
        }));
        setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...pasted]);
        scheduleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rf, touchEditing, takeSnapshot, setNodes, scheduleSave]);

  return (
    <div ref={wrapperRef} className="h-full w-full" onDoubleClick={onDoubleClick}>
      <ReactFlow<MarkdownNodeType, Edge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onMoveEnd={onMoveEnd}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        elementsSelectable={canEdit}
        deleteKeyCode={deleteKeyCode}
        snapToGrid
        snapGrid={snapGrid}
        selectionOnDrag
        panOnDrag={panOnDrag}
        minZoom={0.1}
        fitView
        colorMode={theme}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />

        <Panel position="top-left">
          <div className="flex items-center gap-1 rounded-md border bg-card p-1 shadow-sm">
            <span className="px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Холст
            </span>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              disabled={!canEdit || !canUndo}
              onClick={undo}
              title="Отменить (Ctrl+Z)"
            >
              ↶
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canEdit || !canRedo}
              onClick={redo}
              title="Повторить (Ctrl+Shift+Z)"
            >
              ↷
            </Button>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <Button variant="ghost" size="sm" disabled={!canEdit} onClick={onLayout}>
              Разложить
            </Button>
            <Button variant="ghost" size="sm" disabled={!canEdit} onClick={addNodeAtCenter}>
              + Нода
            </Button>
          </div>
        </Panel>

        {lockedByOther && holder && (
          <Panel position="top-center">
            <div
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: holder.color }}
            >
              {holder.name} редактирует
            </div>
          </Panel>
        )}
      </ReactFlow>

      <TaskDialog
        dialog={dialog}
        projectId={projectId}
        onClose={() => setDialog(null)}
        onCreated={(nodeId, cardId, card) => {
          setNodeCard(nodeId, cardId, card);
          setDialog(null);
        }}
        onLinked={(nodeId, card) => {
          setNodeCard(nodeId, card.id, card);
          setDialog(null);
        }}
      />
    </div>
  );
}

/** Убирает внедрённые колбэки и резолвнутую карточку перед сохранением/клонированием. */
function stripNodeData(data: MarkdownNodeData): CanvasNodeData {
  return { text: data.text, color: data.color, cardId: data.cardId };
}

// ---------------------------------------------------------------------------
// Диалог создания / привязки задачи
// ---------------------------------------------------------------------------
function TaskDialog({
  dialog,
  projectId,
  onClose,
  onCreated,
  onLinked,
}: {
  dialog: DialogState | null;
  projectId: string;
  onClose: () => void;
  onCreated: (nodeId: string, cardId: string, card: LinkedCardDto) => void;
  onLinked: (nodeId: string, card: LinkedCardDto) => void;
}) {
  const [boardId, setBoardId] = useState<string>('');
  const [cardId, setCardId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const open = !!dialog;
  const isLink = dialog?.kind === 'link';

  const { data: boards = [] } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => fetchBoards(projectId),
    enabled: open,
  });
  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId),
    enabled: open && isLink && !!boardId,
  });

  useEffect(() => {
    if (!open) {
      setBoardId('');
      setCardId('');
    }
  }, [open]);

  const cards = useMemo(
    () =>
      board
        ? board.columns.flatMap((c) =>
            c.cards.map((card) => ({ ...card, columnTitle: c.title })),
          )
        : [],
    [board],
  );

  async function onConfirm() {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.kind === 'create') {
        const res = await createTaskFromNode(projectId, dialog.nodeId, boardId);
        onCreated(dialog.nodeId, res.cardId, res.card);
      } else {
        const picked = cards.find((c) => c.id === cardId);
        if (!picked) return;
        const linked: LinkedCardDto = {
          id: picked.id,
          boardId: picked.boardId,
          title: picked.title,
          columnTitle: picked.columnTitle,
          priority: picked.priority ?? null,
        };
        onLinked(dialog.nodeId, linked);
      }
    } finally {
      setBusy(false);
    }
  }

  const canConfirm =
    !busy && !!boardId && (dialog?.kind === 'create' || !!cardId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isLink ? 'Привязать задачу' : 'Создать задачу'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Доска</span>
            <Select value={boardId} onValueChange={(v) => { setBoardId(v); setCardId(''); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите доску" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLink && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Карточка</span>
              <Select value={cardId} onValueChange={setCardId} disabled={!boardId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите карточку" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} · {c.columnTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={onConfirm} disabled={!canConfirm}>
            {busy ? 'Сохранение…' : isLink ? 'Привязать' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
