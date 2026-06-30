import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { EventsGateway } from './events.gateway';

/**
 * Broadcasts a generic "project:changed" event after any successful mutating
 * request (non-GET), so connected clients refetch. Auth routes are excluded.
 */
@Injectable()
export class BoardEventsInterceptor implements NestInterceptor {
  constructor(private readonly events: EventsGateway) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const method: string = req.method;
    const url: string = req.url ?? '';
    const isMutation =
      method !== 'GET' && method !== 'OPTIONS' && method !== 'HEAD';
    const isAuth = url.includes('/api/auth/');

    return next.handle().pipe(
      tap(() => {
        if (isMutation && !isAuth) this.events.emitProjectChanged();
      }),
    );
  }
}
