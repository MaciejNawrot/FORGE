import type { Database, ExerciseRow } from '@acme/db';
import { exercises } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { asc, ilike } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

@Injectable()
export class ExercisesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(search?: string): Promise<ExerciseRow[]> {
    return this.db
      .select()
      .from(exercises)
      .where(search ? ilike(exercises.name, `%${search}%`) : undefined)
      .orderBy(asc(exercises.name));
  }
}
