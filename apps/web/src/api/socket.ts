import { useEffect } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

function socketUrl(): string {
  if (typeof location === 'undefined') return '';
  // In dev the SPA runs on Vite (:4200) while the api/socket is on :3020.
  // In production the SPA is served by the api, so same origin.
  return location.port === '4200' ? 'http://localhost:3020' : location.origin;
}

export function useBoardSocket(queryClient: QueryClient): void {
  useEffect(() => {
    const socket = io(socketUrl(), { transports: ['websocket'] });
    socket.on('board:changed', () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    });
    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
