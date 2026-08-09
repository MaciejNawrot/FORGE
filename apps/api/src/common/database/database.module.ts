import { db } from '@acme/db';
import { Global, Module } from '@nestjs/common';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [{ provide: DATABASE, useValue: db }],
  exports: [DATABASE],
})
export class DatabaseModule {}
