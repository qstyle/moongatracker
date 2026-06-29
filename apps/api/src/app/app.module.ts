import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BoardsModule } from '../boards/boards.module';
import { CardsModule } from '../cards/cards.module';
import { CommentsModule } from '../comments/comments.module';
import { LabelsModule } from '../labels/labels.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AuthModule,
    BoardsModule,
    CardsModule,
    CommentsModule,
    LabelsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
