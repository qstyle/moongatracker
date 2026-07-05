import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Let OnModuleDestroy fire on SIGTERM/SIGINT so the Telegram bot stops
  // long-polling and Prisma disconnects cleanly.
  app.enableShutdownHooks();
  const port = process.env.PORT ? Number(process.env.PORT) : 3020;
  await app.listen(port, '0.0.0.0');
  console.log(`api listening on http://localhost:${port}/api`);
}

bootstrap();
