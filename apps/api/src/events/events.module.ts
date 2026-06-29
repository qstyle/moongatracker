import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventsGateway } from './events.gateway';
import { BoardEventsInterceptor } from './board-events.interceptor';

@Module({
  providers: [
    EventsGateway,
    { provide: APP_INTERCEPTOR, useClass: BoardEventsInterceptor },
  ],
})
export class EventsModule {}
