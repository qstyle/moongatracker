import { join } from 'path';
import { DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { OrgsModule } from '../orgs/orgs.module';
import { ProjectsModule } from '../projects/projects.module';
import { ColumnsModule } from '../columns/columns.module';
import { AuthModule } from '../auth/auth.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { ActivityModule } from '../activity/activity.module';
import { CardsModule } from '../cards/cards.module';
import { CommentsModule } from '../comments/comments.module';
import { EventsModule } from '../events/events.module';
import { AttachmentsModule } from '../attachments/attachments.module';
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
    OrgsModule,
    ProjectsModule,
    ColumnsModule,
    AuthModule,
    ApiTokensModule,
    ActivityModule,
    CardsModule,
    CommentsModule,
    EventsModule,
    AttachmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
