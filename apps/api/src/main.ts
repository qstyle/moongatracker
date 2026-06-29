import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.setGlobalPrefix('api');
  const port = process.env.PORT ? Number(process.env.PORT) : 3020;
  await app.listen(port, '0.0.0.0');
  console.log(`api listening on http://localhost:${port}/api`);
}

bootstrap();
