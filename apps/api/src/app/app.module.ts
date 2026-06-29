import { join } from 'path';
import { DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from '../auth/auth.module';
import { BoardsModule } from '../boards/boards.module';
import { CardsModule } from '../cards/cards.module';
import { CommentsModule } from '../comments/comments.module';
import { LabelsModule } from '../labels/labels.module';
import { EventsModule } from '../events/events.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Serve the built SPA only in production (the container). In dev the web app
// is served by Vite, so we skip static serving to avoid interfering.
const staticModules: DynamicModule[] =
  process.env.NODE_ENV === 'production'
    ? [
        ServeStaticModule.forRoot({
          rootPath: join(process.cwd(), 'apps/web/dist'),
          exclude: ['/api/{*path}'],
        }),
      ]
    : [];

@Module({
  imports: [
    ...staticModules,
    AuthModule,
    BoardsModule,
    CardsModule,
    CommentsModule,
    LabelsModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
