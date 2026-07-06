import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app/app.module';
import { startLandingServer } from './landing-server';

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

  // Second port: serve the built landing (apps/landing/dist). One image, two
  // ports — site (api+web) on PORT, landing on LANDING_PORT.
  startLandingServer();
}

bootstrap();
