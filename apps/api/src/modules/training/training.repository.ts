import type {
  Database,
  ExerciseRow,
  NewTrainingSessionExerciseRow,
  NewTrainingSessionRow,
  NewTrainingSessionSetRow,
  TrainingSessionExerciseRow,
  TrainingSessionRow,
  TrainingSessionSetRow,
} from '@acme/db';
import {
  exercises,
  trainingSessionExercises,
  trainingSessionSets,
  trainingSessions,
} from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, max } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

export type TrainingSessionExerciseWithExercise = TrainingSessionExerciseRow & {
  exercise: ExerciseRow;
  sets: TrainingSessionSetRow[];
};

/** The pooled client or a transaction handle — both expose the same builders. */
type DbClient = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class TrainingRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Runs `fn` inside one transaction; pass `tx` on to the methods that take a client. */
  withTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

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

  async finishSession(
    id: string,
    userId: string,
    durationSeconds: number,
  ): Promise<TrainingSessionRow | undefined> {
    const [row] = await this.db
      .update(trainingSessions)
      .set({ durationSeconds, updatedAt: new Date() })
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .returning();
    return row;
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(trainingSessions)
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .returning({ id: trainingSessions.id });
    return deleted.length > 0;
  }

  private async attachSets(
    groups: (TrainingSessionExerciseRow & { exercise: ExerciseRow })[],
  ): Promise<TrainingSessionExerciseWithExercise[]> {
    if (groups.length === 0) return [];
    const groupIds = groups.map((group) => group.id);
    const sets = await this.db
      .select()
      .from(trainingSessionSets)
      .where(inArray(trainingSessionSets.sessionExerciseId, groupIds))
      .orderBy(asc(trainingSessionSets.position));

    const setsByGroup = new Map<string, TrainingSessionSetRow[]>();
    for (const set of sets) {
      const existing = setsByGroup.get(set.sessionExerciseId) ?? [];
      existing.push(set);
      setsByGroup.set(set.sessionExerciseId, existing);
    }
    return groups.map((group) => ({ ...group, sets: setsByGroup.get(group.id) ?? [] }));
  }

  async listSessionExercises(sessionId: string): Promise<TrainingSessionExerciseWithExercise[]> {
    const groups = await this.db
      .select({
        id: trainingSessionExercises.id,
        sessionId: trainingSessionExercises.sessionId,
        exerciseId: trainingSessionExercises.exerciseId,
        notes: trainingSessionExercises.notes,
        restSeconds: trainingSessionExercises.restSeconds,
        position: trainingSessionExercises.position,
        createdAt: trainingSessionExercises.createdAt,
        updatedAt: trainingSessionExercises.updatedAt,
        exercise: exercises,
      })
      .from(trainingSessionExercises)
      .innerJoin(exercises, eq(exercises.id, trainingSessionExercises.exerciseId))
      .where(eq(trainingSessionExercises.sessionId, sessionId))
      .orderBy(asc(trainingSessionExercises.position));
    return this.attachSets(groups);
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
        notes: trainingSessionExercises.notes,
        restSeconds: trainingSessionExercises.restSeconds,
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
    if (!row) return undefined;
    const [withSets] = await this.attachSets([row]);
    return withSets;
  }

  /** Next free `position` for a new exercise group appended to the end of a session. */
  async nextPosition(sessionId: string, dbClient: DbClient = this.db): Promise<number> {
    const [row] = await dbClient
      .select({ value: max(trainingSessionExercises.position) })
      .from(trainingSessionExercises)
      .where(eq(trainingSessionExercises.sessionId, sessionId));
    return (row?.value ?? -1) + 1;
  }

  async findGroupByExercise(
    sessionId: string,
    exerciseId: string,
  ): Promise<TrainingSessionExerciseRow | undefined> {
    const [row] = await this.db
      .select()
      .from(trainingSessionExercises)
      .where(
        and(
          eq(trainingSessionExercises.sessionId, sessionId),
          eq(trainingSessionExercises.exerciseId, exerciseId),
        ),
      )
      // Historical sessions can hold duplicate groups for one exercise (the
      // pre-per-set flow inserted one per logged set); oldest always wins.
      .orderBy(asc(trainingSessionExercises.createdAt), asc(trainingSessionExercises.position))
      .limit(1);
    return row;
  }

  async createExerciseGroup(
    input: Pick<NewTrainingSessionExerciseRow, 'sessionId' | 'exerciseId' | 'position'>,
    dbClient: DbClient = this.db,
  ): Promise<TrainingSessionExerciseRow> {
    const [row] = await dbClient.insert(trainingSessionExercises).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  /** Next free `position` for a new set appended within one exercise group. */
  async nextSetPosition(sessionExerciseId: string, dbClient: DbClient = this.db): Promise<number> {
    const [row] = await dbClient
      .select({ value: max(trainingSessionSets.position) })
      .from(trainingSessionSets)
      .where(eq(trainingSessionSets.sessionExerciseId, sessionExerciseId));
    return (row?.value ?? -1) + 1;
  }

  async addSet(
    input: Pick<NewTrainingSessionSetRow, 'sessionExerciseId' | 'reps' | 'weightKg' | 'position'>,
    dbClient: DbClient = this.db,
  ): Promise<TrainingSessionSetRow> {
    const [row] = await dbClient.insert(trainingSessionSets).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async updateSet(
    setId: string,
    sessionExerciseId: string,
    input: { reps: number; weightKg: number | null },
  ): Promise<boolean> {
    const updated = await this.db
      .update(trainingSessionSets)
      .set({ reps: input.reps, weightKg: input.weightKg, updatedAt: new Date() })
      .where(
        and(
          eq(trainingSessionSets.id, setId),
          eq(trainingSessionSets.sessionExerciseId, sessionExerciseId),
        ),
      )
      .returning({ id: trainingSessionSets.id });
    return updated.length > 0;
  }

  async removeSet(
    setId: string,
    sessionExerciseId: string,
    dbClient: DbClient = this.db,
  ): Promise<boolean> {
    const deleted = await dbClient
      .delete(trainingSessionSets)
      .where(
        and(
          eq(trainingSessionSets.id, setId),
          eq(trainingSessionSets.sessionExerciseId, sessionExerciseId),
        ),
      )
      .returning({ id: trainingSessionSets.id });
    return deleted.length > 0;
  }

  async hasRemainingSets(
    sessionExerciseId: string,
    dbClient: DbClient = this.db,
  ): Promise<boolean> {
    const [row] = await dbClient
      .select({ id: trainingSessionSets.id })
      .from(trainingSessionSets)
      .where(eq(trainingSessionSets.sessionExerciseId, sessionExerciseId))
      .limit(1);
    return row !== undefined;
  }

  async updateExerciseNotes(id: string, sessionId: string, notes: string | null): Promise<boolean> {
    const updated = await this.db
      .update(trainingSessionExercises)
      .set({ notes, updatedAt: new Date() })
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .returning({ id: trainingSessionExercises.id });
    return updated.length > 0;
  }

  async updateExerciseRest(id: string, sessionId: string, restSeconds: number): Promise<boolean> {
    const updated = await this.db
      .update(trainingSessionExercises)
      .set({ restSeconds, updatedAt: new Date() })
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .returning({ id: trainingSessionExercises.id });
    return updated.length > 0;
  }

  async removeExercise(
    id: string,
    sessionId: string,
    dbClient: DbClient = this.db,
  ): Promise<boolean> {
    const deleted = await dbClient
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
  ): Promise<
    Map<string, { reps: number; weightKg: number | null; restSeconds: number | null; date: string }>
  > {
    const rows = await this.db
      .select({
        exerciseId: trainingSessionExercises.exerciseId,
        reps: trainingSessionSets.reps,
        weightKg: trainingSessionSets.weightKg,
        restSeconds: trainingSessionExercises.restSeconds,
        date: trainingSessions.date,
        setCreatedAt: trainingSessionSets.createdAt,
      })
      .from(trainingSessionSets)
      .innerJoin(
        trainingSessionExercises,
        eq(trainingSessionExercises.id, trainingSessionSets.sessionExerciseId),
      )
      .innerJoin(trainingSessions, eq(trainingSessions.id, trainingSessionExercises.sessionId))
      .where(
        and(
          eq(trainingSessions.userId, userId),
          inArray(trainingSessionExercises.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(trainingSessions.date), desc(trainingSessionSets.createdAt));

    const result = new Map<
      string,
      { reps: number; weightKg: number | null; restSeconds: number | null; date: string }
    >();
    for (const row of rows) {
      // Rows are ordered most-recent-first, so the first row seen per
      // exercise id is that exercise's most recently logged individual set.
      if (!result.has(row.exerciseId)) {
        result.set(row.exerciseId, {
          reps: row.reps,
          weightKg: row.weightKg,
          restSeconds: row.restSeconds,
          date: row.date,
        });
      }
    }
    return result;
  }
}
