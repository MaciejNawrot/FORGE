import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { TsRestModule } from '@ts-rest/nest';
import type { FastifyInstance } from 'fastify';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './common/database/database.module.js';
import { popSetCookies } from './common/fastify-cookie-bridge.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { env } from './config/env.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ExercisesModule } from './modules/exercises/exercises.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { TrainingModule } from './modules/training/training.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkoutsModule } from './modules/workouts/workouts.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    TsRestModule.register({ validateResponses: true }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    UsersModule,
    WorkoutsModule,
    ExercisesModule,
    TrainingModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  onModuleInit() {
    // Registered here (not main.ts) so it applies regardless of bootstrap
    // path — main.ts's real listen(), or a TestingModule-built app in e2e
    // tests, both go through AppModule's lifecycle.
    const fastify = this.httpAdapterHost.httpAdapter.getInstance<FastifyInstance>();
    fastify.addHook('onSend', async (request, reply, payload) => {
      const cookies = popSetCookies(request);
      if (cookies) {
        reply.header('set-cookie', cookies);
      }
      return payload;
    });
  }
}
