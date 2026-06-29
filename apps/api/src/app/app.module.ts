import { Module } from '@nestjs/common';
import { BoardsModule } from '../boards/boards.module';
import { CardsModule } from '../cards/cards.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [BoardsModule, CardsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
