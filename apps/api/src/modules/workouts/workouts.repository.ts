import type {
  Database,
  NewWorkoutExerciseRow,
  NewWorkoutPlanRow,
  WorkoutExerciseRow,
  WorkoutPlanRow,
} from '@acme/db';
import { workoutExercises, workoutPlans } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, max } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

export type WorkoutPlanRowWithCount = WorkoutPlanRow & { exerciseCount: number };

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

  async listTemplates(): Promise<Array<WorkoutPlanRow & { exercises: WorkoutExerciseRow[] }>> {
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
          forkedFromId: template.id,
        })
        .returning();
      if (!plan) throw new Error('Insert did not return a row');

      if (sourceExercises.length > 0) {
        await tx.insert(workoutExercises).values(
          sourceExercises.map((exercise) => ({
            planId: plan.id,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            weightKg: exercise.weightKg,
            position: exercise.position,
          })),
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

  async listExercises(planId: string): Promise<WorkoutExerciseRow[]> {
    return this.db
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.planId, planId))
      .orderBy(asc(workoutExercises.position));
  }

  async createPlan(
    input: Pick<NewWorkoutPlanRow, 'userId' | 'name' | 'notes'>,
  ): Promise<WorkoutPlanRow> {
    const [row] = await this.db.insert(workoutPlans).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async updatePlan(
    id: string,
    userId: string,
    input: Partial<Pick<NewWorkoutPlanRow, 'name' | 'notes'>>,
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
      'planId' | 'name' | 'sets' | 'reps' | 'weightKg' | 'position'
    >,
  ): Promise<WorkoutExerciseRow> {
    const [row] = await this.db.insert(workoutExercises).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async findExerciseById(id: string, planId: string): Promise<WorkoutExerciseRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workoutExercises)
      .where(and(eq(workoutExercises.id, id), eq(workoutExercises.planId, planId)))
      .limit(1);
    return row;
  }

  async updateExercise(
    id: string,
    planId: string,
    input: Partial<Pick<NewWorkoutExerciseRow, 'name' | 'sets' | 'reps' | 'weightKg'>>,
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
}
