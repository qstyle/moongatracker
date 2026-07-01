import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow, type Edge, type Node } from '@xyflow/react';

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

export interface UndoRedo {
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 100;

// Достаточно глубокая копия для нод/рёбер (структура сериализуема).
function clone<T>(items: T[]): T[] {
  return items.map((i) => ({ ...i })) as T[];
}

/**
 * Снапшот-based undo/redo. Вызывать takeSnapshot() ПЕРЕД мутирующей
 * операцией. Клавиши Ctrl/Cmd+Z и Ctrl/Cmd+Shift+Z навешиваются здесь.
 * `enabled` — можно ли применять undo/redo (лок не удерживается другим).
 */
export function useUndoRedo(enabled = true): UndoRedo {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const takeSnapshot = useCallback(() => {
    setPast((p) => {
      const next = [...p, { nodes: clone(getNodes()), edges: clone(getEdges()) }];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setFuture([]);
  }, [getNodes, getEdges]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [...f, { nodes: clone(getNodes()), edges: clone(getEdges()) }]);
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return p.slice(0, -1);
    });
  }, [getNodes, getEdges, setNodes, setEdges]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setPast((p) => [...p, { nodes: clone(getNodes()), edges: clone(getEdges()) }]);
      setNodes(next.nodes);
      setEdges(next.edges);
      return f.slice(0, -1);
    });
  }, [getNodes, getEdges, setNodes, setEdges]);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!enabledRef.current) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement | null;
      // Не перехватываем в полях ввода.
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return {
    takeSnapshot,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
