import 'dotenv/config';
import 'reflect-metadata';
import { contract } from '@acme/contracts';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { generateOpenApi } from '@ts-rest/open-api';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  await app.register(fastifyHelmet);
  await app.register(fastifyCors, { origin: env.CORS_ORIGIN, credentials: true });

  const openApiDocument = generateOpenApi(
    contract,
    { info: { title: 'GYM0 API', version: '0.0.0' } },
    { setOperationId: true },
  );
  SwaggerModule.setup('docs', app, openApiDocument);

  await app.listen(env.PORT, env.HOST);
}

bootstrap();
