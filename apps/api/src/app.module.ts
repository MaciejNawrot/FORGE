import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TsRestModule } from '@ts-rest/nest';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './common/database/database.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { env } from './config/env.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';

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
    HealthModule,
    UsersModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
