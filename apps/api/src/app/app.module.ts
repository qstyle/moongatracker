import { Module } from '@nestjs/common';
import { BoardsModule } from '../boards/boards.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [BoardsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
