import type {
  Database,
  ExerciseRow,
  NewTrainingSessionExerciseRow,
  NewTrainingSessionRow,
  TrainingSessionExerciseRow,
  TrainingSessionRow,
} from '@acme/db';
import { exercises, trainingSessionExercises, trainingSessions } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, max } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

export type TrainingSessionExerciseWithExercise = TrainingSessionExerciseRow & {
  exercise: ExerciseRow;
};

@Injectable()
export class TrainingRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listSessions(userId: string, from?: string, to?: string): Promise<TrainingSessionRow[]> {
    const conditions = [eq(trainingSessions.userId, userId)];
    if (from) conditions.push(gte(trainingSessions.date, from));
    if (to) conditions.push(lte(trainingSessions.date, to));

    return this.db
      .select()
      .from(trainingSessions)
      .where(and(...conditions))
      .orderBy(asc(trainingSessions.date));
  }

  async findSessionById(id: string, userId: string): Promise<TrainingSessionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .limit(1);
    return row;
  }

  async createSession(
    input: Pick<NewTrainingSessionRow, 'userId' | 'planId' | 'date' | 'type' | 'notes'>,
  ): Promise<TrainingSessionRow> {
    const [row] = await this.db.insert(trainingSessions).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(trainingSessions)
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .returning({ id: trainingSessions.id });
    return deleted.length > 0;
  }

  async listSessionExercises(sessionId: string): Promise<TrainingSessionExerciseWithExercise[]> {
    return this.db
      .select({
        id: trainingSessionExercises.id,
        sessionId: trainingSessionExercises.sessionId,
        exerciseId: trainingSessionExercises.exerciseId,
        sets: trainingSessionExercises.sets,
        reps: trainingSessionExercises.reps,
        weightKg: trainingSessionExercises.weightKg,
        position: trainingSessionExercises.position,
        createdAt: trainingSessionExercises.createdAt,
        updatedAt: trainingSessionExercises.updatedAt,
        exercise: exercises,
      })
      .from(trainingSessionExercises)
      .innerJoin(exercises, eq(exercises.id, trainingSessionExercises.exerciseId))
      .where(eq(trainingSessionExercises.sessionId, sessionId))
      .orderBy(asc(trainingSessionExercises.position));
  }

  async findSessionExerciseById(
    id: string,
    sessionId: string,
  ): Promise<TrainingSessionExerciseWithExercise | undefined> {
    const [row] = await this.db
      .select({
        id: trainingSessionExercises.id,
        sessionId: trainingSessionExercises.sessionId,
        exerciseId: trainingSessionExercises.exerciseId,
        sets: trainingSessionExercises.sets,
        reps: trainingSessionExercises.reps,
        weightKg: trainingSessionExercises.weightKg,
        position: trainingSessionExercises.position,
        createdAt: trainingSessionExercises.createdAt,
        updatedAt: trainingSessionExercises.updatedAt,
        exercise: exercises,
      })
      .from(trainingSessionExercises)
      .innerJoin(exercises, eq(exercises.id, trainingSessionExercises.exerciseId))
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .limit(1);
    return row;
  }

  /** Next free `position` for a new exercise appended to the end of a session. */
  async nextPosition(sessionId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(trainingSessionExercises.position) })
      .from(trainingSessionExercises)
      .where(eq(trainingSessionExercises.sessionId, sessionId));
    return (row?.value ?? -1) + 1;
  }

  async addExercise(
    input: Pick<
      NewTrainingSessionExerciseRow,
      'sessionId' | 'exerciseId' | 'sets' | 'reps' | 'weightKg' | 'position'
    >,
  ): Promise<TrainingSessionExerciseRow> {
    const [row] = await this.db.insert(trainingSessionExercises).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async removeExercise(id: string, sessionId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(trainingSessionExercises)
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .returning({ id: trainingSessionExercises.id });
    return deleted.length > 0;
  }

  async lastPerformanceByExerciseIds(
    userId: string,
    exerciseIds: string[],
  ): Promise<Map<string, { sets: number; reps: number; weightKg: number | null; date: string }>> {
    const rows = await this.db
      .select({
        exerciseId: trainingSessionExercises.exerciseId,
        sets: trainingSessionExercises.sets,
        reps: trainingSessionExercises.reps,
        weightKg: trainingSessionExercises.weightKg,
        date: trainingSessions.date,
        createdAt: trainingSessionExercises.createdAt,
      })
      .from(trainingSessionExercises)
      .innerJoin(trainingSessions, eq(trainingSessions.id, trainingSessionExercises.sessionId))
      .where(
        and(
          eq(trainingSessions.userId, userId),
          inArray(trainingSessionExercises.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(trainingSessions.date), desc(trainingSessionExercises.createdAt));

    const result = new Map<
      string,
      { sets: number; reps: number; weightKg: number | null; date: string }
    >();
    for (const row of rows) {
      // Rows are ordered most-recent-first, so the first row seen per
      // exercise id is that exercise's most recent logged performance.
      if (!result.has(row.exerciseId)) {
        result.set(row.exerciseId, {
          sets: row.sets,
          reps: row.reps,
          weightKg: row.weightKg,
          date: row.date,
        });
      }
    }
    return result;
  }
}
