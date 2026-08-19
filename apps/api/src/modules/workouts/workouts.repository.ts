import type {
  Database,
  ExerciseRow,
  NewWorkoutExerciseRow,
  NewWorkoutPlanRow,
  WorkoutExerciseRow,
  WorkoutPlanRow,
} from '@acme/db';
import { exercises, workoutExercises, workoutPlans } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, gt, inArray, lt, max, sql } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';
import { PairConflictError } from '../../common/errors/pair-conflict.error.js';

export type WorkoutPlanRowWithCount = WorkoutPlanRow & { exerciseCount: number };
export type WorkoutExerciseWithExercise = WorkoutExerciseRow & { exercise: ExerciseRow };

@Injectable()
export class WorkoutsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listPlans(userId: string): Promise<WorkoutPlanRowWithCount[]> {
    const rows = await this.db
      .select({
        id: workoutPlans.id,
        userId: workoutPlans.userId,
        name: workoutPlans.name,
        notes: workoutPlans.notes,
        category: workoutPlans.category,
        isTemplate: workoutPlans.isTemplate,
        forkedFromId: workoutPlans.forkedFromId,
        createdAt: workoutPlans.createdAt,
        updatedAt: workoutPlans.updatedAt,
        exerciseCount: count(workoutExercises.id),
      })
      .from(workoutPlans)
      .leftJoin(workoutExercises, eq(workoutExercises.planId, workoutPlans.id))
      .where(eq(workoutPlans.userId, userId))
      .groupBy(workoutPlans.id)
      .orderBy(asc(workoutPlans.createdAt));

    return rows.map((row) => ({ ...row, exerciseCount: Number(row.exerciseCount) }));
  }

  async listTemplates(): Promise<
    Array<WorkoutPlanRow & { exercises: WorkoutExerciseWithExercise[] }>
  > {
    const templates = await this.db
      .select()
      .from(workoutPlans)
      .where(eq(workoutPlans.isTemplate, true))
      .orderBy(asc(workoutPlans.createdAt));

    return Promise.all(
      templates.map(async (template) => ({
        ...template,
        exercises: await this.listExercises(template.id),
      })),
    );
  }

  async findTemplateById(id: string): Promise<WorkoutPlanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.isTemplate, true)))
      .limit(1);
    return row;
  }

  /** Deep-copies a template into a new plan owned by `userId`. */
  async forkPlan(template: WorkoutPlanRow, userId: string): Promise<WorkoutPlanRow> {
    const sourceExercises = await this.listExercises(template.id);

    return this.db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(workoutPlans)
        .values({
          userId,
          name: template.name,
          notes: template.notes,
          category: template.category,
          forkedFromId: template.id,
        })
        .returning();
      if (!plan) throw new Error('Insert did not return a row');

      if (sourceExercises.length > 0) {
        const pairGroupIdMap = new Map<string, string>();
        await tx.insert(workoutExercises).values(
          sourceExercises.map((exercise) => {
            let pairGroupId: string | null = null;
            if (exercise.pairGroupId) {
              pairGroupId = pairGroupIdMap.get(exercise.pairGroupId) ?? crypto.randomUUID();
              pairGroupIdMap.set(exercise.pairGroupId, pairGroupId);
            }
            return {
              planId: plan.id,
              exerciseId: exercise.exerciseId,
              sets: exercise.sets,
              reps: exercise.reps,
              weightKg: exercise.weightKg,
              position: exercise.position,
              pairGroupId,
            };
          }),
        );
      }

      return plan;
    });
  }

  async findPlanById(id: string, userId: string): Promise<WorkoutPlanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .limit(1);
    return row;
  }

  async listExercises(planId: string): Promise<WorkoutExerciseWithExercise[]> {
    return this.db
      .select({
        id: workoutExercises.id,
        planId: workoutExercises.planId,
        exerciseId: workoutExercises.exerciseId,
        sets: workoutExercises.sets,
        reps: workoutExercises.reps,
        weightKg: workoutExercises.weightKg,
        position: workoutExercises.position,
        pairGroupId: workoutExercises.pairGroupId,
        createdAt: workoutExercises.createdAt,
        updatedAt: workoutExercises.updatedAt,
        exercise: exercises,
      })
      .from(workoutExercises)
      .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
      .where(eq(workoutExercises.planId, planId))
      .orderBy(asc(workoutExercises.position));
  }

  async createPlan(
    input: Pick<NewWorkoutPlanRow, 'userId' | 'name' | 'notes' | 'category'>,
  ): Promise<WorkoutPlanRow> {
    const [row] = await this.db.insert(workoutPlans).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async updatePlan(
    id: string,
    userId: string,
    input: Partial<Pick<NewWorkoutPlanRow, 'name' | 'notes' | 'category'>>,
  ): Promise<WorkoutPlanRow | undefined> {
    const [row] = await this.db
      .update(workoutPlans)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .returning();
    return row;
  }

  async removePlan(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .returning({ id: workoutPlans.id });
    return deleted.length > 0;
  }

  /** Next free `position` for a new exercise appended to the end of a plan. */
  async nextPosition(planId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(workoutExercises.position) })
      .from(workoutExercises)
      .where(eq(workoutExercises.planId, planId));
    return (row?.value ?? -1) + 1;
  }

  async addExercise(
    input: Pick<
      NewWorkoutExerciseRow,
      'planId' | 'exerciseId' | 'sets' | 'reps' | 'weightKg' | 'position'
    >,
  ): Promise<WorkoutExerciseRow> {
    const [row] = await this.db.insert(workoutExercises).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async findExerciseById(
    id: string,
    planId: string,
  ): Promise<WorkoutExerciseWithExercise | undefined> {
    const [row] = await this.db
      .select({
        id: workoutExercises.id,
        planId: workoutExercises.planId,
        exerciseId: workoutExercises.exerciseId,
        sets: workoutExercises.sets,
        reps: workoutExercises.reps,
        weightKg: workoutExercises.weightKg,
        position: workoutExercises.position,
        pairGroupId: workoutExercises.pairGroupId,
        createdAt: workoutExercises.createdAt,
        updatedAt: workoutExercises.updatedAt,
        exercise: exercises,
      })
      .from(workoutExercises)
      .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
      .where(and(eq(workoutExercises.id, id), eq(workoutExercises.planId, planId)))
      .limit(1);
    return row;
  }

  async updateExercise(
    id: string,
    planId: string,
    input: Partial<Pick<NewWorkoutExerciseRow, 'sets' | 'reps' | 'weightKg'>>,
  ): Promise<WorkoutExerciseRow | undefined> {
    const [row] = await this.db
      .update(workoutExercises)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(workoutExercises.id, id), eq(workoutExercises.planId, planId)))
      .returning();
    return row;
  }

  async removeExercise(id: string, planId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(workoutExercises)
      .where(and(eq(workoutExercises.id, id), eq(workoutExercises.planId, planId)))
      .returning({ id: workoutExercises.id });
    return deleted.length > 0;
  }

  /**
   * Pairs two exercises in a plan into a superset. Repositions the later
   * exercise to sit immediately after the earlier one (by position),
   * shifting anything between them by one. Returns the primary exercise's
   * updated row, or `undefined` if either exercise isn't in this plan.
   * Throws `PairConflictError` if either side is already paired.
   */
  async pairExercises(
    planId: string,
    exerciseId: string,
    pairWithExerciseId: string,
  ): Promise<WorkoutExerciseRow | undefined> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(workoutExercises)
        .where(
          and(
            eq(workoutExercises.planId, planId),
            inArray(workoutExercises.id, [exerciseId, pairWithExerciseId]),
          ),
        );
      const primary = rows.find((row) => row.id === exerciseId);
      const partner = rows.find((row) => row.id === pairWithExerciseId);
      if (!primary || !partner) return undefined;
      if (primary.pairGroupId || partner.pairGroupId) {
        throw new PairConflictError('One of these exercises is already paired');
      }

      const [first, second] =
        primary.position < partner.position ? [primary, partner] : [partner, primary];
      const groupId = crypto.randomUUID();

      if (second.position !== first.position + 1) {
        await tx
          .update(workoutExercises)
          .set({ position: sql`${workoutExercises.position} + 1` })
          .where(
            and(
              eq(workoutExercises.planId, planId),
              gt(workoutExercises.position, first.position),
              lt(workoutExercises.position, second.position),
            ),
          );
      }

      await tx
        .update(workoutExercises)
        .set({ pairGroupId: groupId, updatedAt: new Date() })
        .where(eq(workoutExercises.id, first.id));
      await tx
        .update(workoutExercises)
        .set({ pairGroupId: groupId, position: first.position + 1, updatedAt: new Date() })
        .where(eq(workoutExercises.id, second.id));

      const [updatedPrimary] = await tx
        .select()
        .from(workoutExercises)
        .where(eq(workoutExercises.id, exerciseId));
      return updatedPrimary;
    });
  }

  /** Clears the pairing tag from an exercise and its partner. Returns the
   * updated row, or `undefined` if the exercise isn't in this plan. Throws
   * `PairConflictError` if the exercise isn't currently paired. */
  async unpairExercise(
    planId: string,
    exerciseId: string,
  ): Promise<WorkoutExerciseRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workoutExercises)
      .where(and(eq(workoutExercises.id, exerciseId), eq(workoutExercises.planId, planId)))
      .limit(1);
    if (!row) return undefined;
    if (!row.pairGroupId) throw new PairConflictError('This exercise is not paired');

    await this.db
      .update(workoutExercises)
      .set({ pairGroupId: null, updatedAt: new Date() })
      .where(
        and(eq(workoutExercises.planId, planId), eq(workoutExercises.pairGroupId, row.pairGroupId)),
      );

    const [updated] = await this.db
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.id, exerciseId));
    return updated;
  }
}
