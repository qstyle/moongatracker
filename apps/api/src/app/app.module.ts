import { join } from 'path';
import { DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ProjectsModule } from '../projects/projects.module';
import { BoardsModule } from '../boards/boards.module';
import { ColumnsModule } from '../columns/columns.module';
import { AuthModule } from '../auth/auth.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { ActivityModule } from '../activity/activity.module';
import { CardsModule } from '../cards/cards.module';
import { CommentsModule } from '../comments/comments.module';
import { EventsModule } from '../events/events.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { WikiModule } from '../wiki/wiki.module';
import { CanvasModule } from '../canvas/canvas.module';
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
          // SPA fallback: serve index.html for any unmatched non-API GET so
          // that direct links / F5 on client-side routes (/login, /settings,
          // /boards/:id, ...) load the app instead of a JSON 404. On the
          // Fastify driver this fallback is gated behind `fallthrough`.
          serveStaticOptions: { fallthrough: true },
        }),
      ]
    : [];

@Module({
  imports: [
    ...staticModules,
    ProjectsModule,
    BoardsModule,
    ColumnsModule,
    AuthModule,
    ApiTokensModule,
    ActivityModule,
    CardsModule,
    CommentsModule,
    EventsModule,
    AttachmentsModule,
    WikiModule,
    CanvasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
