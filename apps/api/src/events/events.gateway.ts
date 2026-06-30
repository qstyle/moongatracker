import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface LockHolder {
  userId: string;
  name: string;
  color: string;
  socketId: string;
  lockedAt: number;
}

const LOCK_TTL_MS = 2 * 60 * 1000;

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** projectId -> текущий держатель лока холста (in-memory, эфемерно). */
  private readonly locks = new Map<string, LockHolder>();

  emitBoardChanged(): void {
    this.server?.emit('board:changed');
  }

  private room(projectId: string): string {
    return `project:${projectId}`;
  }

  private isStale(h: LockHolder): boolean {
    return Date.now() - h.lockedAt > LOCK_TTL_MS;
  }

  @SubscribeMessage('canvas:join')
  canvasJoin(client: Socket, payload: { projectId: string }): { holder: LockHolder | null } {
    client.join(this.room(payload.projectId));
    const h = this.locks.get(payload.projectId);
    return { holder: h && !this.isStale(h) ? h : null };
  }

  @SubscribeMessage('canvas:acquire')
  canvasAcquire(
    client: Socket,
    payload: { projectId: string; userId: string; name: string; color: string },
  ): { ok: boolean; holder: LockHolder | null } {
    const current = this.locks.get(payload.projectId);
    if (current && current.socketId !== client.id && !this.isStale(current)) {
      return { ok: false, holder: current };
    }
    const holder: LockHolder = {
      userId: payload.userId,
      name: payload.name,
      color: payload.color,
      socketId: client.id,
      lockedAt: Date.now(),
    };
    this.locks.set(payload.projectId, holder);
    this.server?.to(this.room(payload.projectId)).emit('canvas:locked', { projectId: payload.projectId, holder });
    return { ok: true, holder };
  }

  @SubscribeMessage('canvas:heartbeat')
  canvasHeartbeat(client: Socket, payload: { projectId: string }): void {
    const h = this.locks.get(payload.projectId);
    if (h && h.socketId === client.id) h.lockedAt = Date.now();
  }

  @SubscribeMessage('canvas:release')
  canvasRelease(client: Socket, payload: { projectId: string }): void {
    const h = this.locks.get(payload.projectId);
    if (h && h.socketId === client.id) {
      this.locks.delete(payload.projectId);
      this.server?.to(this.room(payload.projectId)).emit('canvas:unlocked', { projectId: payload.projectId });
    }
  }

  handleDisconnect(client: Socket): void {
    for (const [projectId, h] of this.locks.entries()) {
      if (h.socketId === client.id) {
        this.locks.delete(projectId);
        this.server?.to(this.room(projectId)).emit('canvas:unlocked', { projectId });
      }
    }
  }
}
