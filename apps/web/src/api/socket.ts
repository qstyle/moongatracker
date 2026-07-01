import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

function socketUrl(): string {
  if (typeof location === 'undefined') return '';
  // In dev the SPA runs on Vite (:4200) while the api/socket is on :3020.
  // In production the SPA is served by the api, so same origin.
  return location.port === '4200' ? 'http://localhost:3020' : location.origin;
}

export function useBoardSocket(
  boardId: string,
  queryClient: QueryClient,
): void {
  useEffect(() => {
    if (!boardId) return;
    const socket = io(socketUrl(), { transports: ['websocket'] });
    socket.on('board:changed', () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    });
    return () => {
      socket.disconnect();
    };
  }, [boardId, queryClient]);
}

export interface LockHolder {
  userId: string;
  name: string;
  color: string;
  lockedAt: number;
}

export interface CanvasSocket {
  holder: LockHolder | null;
  acquire: (me: { userId: string; name: string; color: string }) => Promise<boolean>;
  release: () => void;
  heartbeat: () => void;
}

/** Подписка на изменения холста + управление локом проекта. */
export function useCanvasSocket(projectId: string, queryClient: QueryClient): CanvasSocket {
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [holder, setHolder] = useState<LockHolder | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const socket = io(socketUrl(), { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('canvas:join', { projectId }, (res: { holder: LockHolder | null }) => {
      setHolder(res?.holder ?? null);
    });
    socket.on('board:changed', () => {
      queryClient.invalidateQueries({ queryKey: ['canvas', projectId] });
    });
    socket.on('canvas:locked', (p: { projectId: string; holder: LockHolder }) => {
      if (p.projectId === projectId) setHolder(p.holder);
    });
    socket.on('canvas:unlocked', (p: { projectId: string }) => {
      if (p.projectId === projectId) setHolder(null);
    });
    return () => {
      socket.emit('canvas:release', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, queryClient]);

  // Стабильные колбэки: иначе их новая идентичность каждый рендер ломает
  // зависящие useCallback/useEffect у потребителя (сброс editing-лока и т.п.).
  const acquire = useCallback(
    (me: { userId: string; name: string; color: string }) =>
      new Promise<boolean>((resolve) => {
        socketRef.current?.emit(
          'canvas:acquire',
          { projectId, ...me },
          (res: { ok: boolean; holder: LockHolder | null }) => {
            setHolder(res?.holder ?? null);
            resolve(!!res?.ok);
          },
        );
      }),
    [projectId],
  );
  const release = useCallback(
    () => socketRef.current?.emit('canvas:release', { projectId }),
    [projectId],
  );
  const heartbeat = useCallback(
    () => socketRef.current?.emit('canvas:heartbeat', { projectId }),
    [projectId],
  );

  return { holder, acquire, release, heartbeat };
}
