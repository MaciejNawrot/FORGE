import type {
  CreateWorkoutExerciseInput,
  CreateWorkoutPlanInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutPlanInput,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutPlanListItem,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { PairConflictError } from '../../common/errors/pair-conflict.error.js';
import { WorkoutsRepository } from './workouts.repository.js';

export type PairExerciseResult =
  | { outcome: 'ok'; exercise: WorkoutExercise }
  | { outcome: 'not-found' }
  | { outcome: 'conflict'; message: string };

@Injectable()
export class WorkoutsService {
  constructor(private readonly workoutsRepository: WorkoutsRepository) {}

  async listPlans(userId: string): Promise<WorkoutPlanListItem[]> {
    return this.workoutsRepository.listPlans(userId);
  }

  async listTemplates(): Promise<WorkoutPlanWithExercises[]> {
    return this.workoutsRepository.listTemplates();
  }

  async forkPlan(templateId: string, userId: string): Promise<WorkoutPlan | undefined> {
    const template = await this.workoutsRepository.findTemplateById(templateId);
    if (!template) return undefined;
    return this.workoutsRepository.forkPlan(template, userId);
  }

  async getPlan(id: string, userId: string): Promise<WorkoutPlanWithExercises | undefined> {
    const plan = await this.workoutsRepository.findPlanById(id, userId);
    if (!plan) return undefined;
    const exercises = await this.workoutsRepository.listExercises(id);
    return { ...plan, exercises };
  }

  async createPlan(userId: string, input: CreateWorkoutPlanInput): Promise<WorkoutPlan> {
    return this.workoutsRepository.createPlan({
      userId,
      name: input.name,
      notes: input.notes ?? null,
      category: input.category ?? null,
    });
  }

  async updatePlan(
    id: string,
    userId: string,
    input: UpdateWorkoutPlanInput,
  ): Promise<WorkoutPlan | undefined> {
    return this.workoutsRepository.updatePlan(id, userId, input);
  }

  async removePlan(id: string, userId: string): Promise<boolean> {
    return this.workoutsRepository.removePlan(id, userId);
  }

  async addExercise(
    planId: string,
    userId: string,
    input: CreateWorkoutExerciseInput,
  ): Promise<WorkoutExercise | undefined> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return undefined;
    const position = await this.workoutsRepository.nextPosition(planId);
    const created = await this.workoutsRepository.addExercise({
      planId,
      exerciseId: input.exerciseId,
      sets: input.sets,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      position,
    });
    return this.workoutsRepository.findExerciseById(created.id, planId);
  }

  async updateExercise(
    planId: string,
    exerciseId: string,
    userId: string,
    input: UpdateWorkoutExerciseInput,
  ): Promise<WorkoutExercise | undefined> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return undefined;
    const updated = await this.workoutsRepository.updateExercise(exerciseId, planId, input);
    if (!updated) return undefined;
    return this.workoutsRepository.findExerciseById(exerciseId, planId);
  }

  async removeExercise(planId: string, exerciseId: string, userId: string): Promise<boolean> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return false;
    return this.workoutsRepository.removeExercise(exerciseId, planId);
  }

  async pairExercise(
    planId: string,
    exerciseId: string,
    userId: string,
    pairWithExerciseId: string,
  ): Promise<PairExerciseResult> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return { outcome: 'not-found' };
    if (exerciseId === pairWithExerciseId) {
      return { outcome: 'conflict', message: 'Cannot pair an exercise with itself' };
    }

    let updated: Awaited<ReturnType<typeof this.workoutsRepository.pairExercises>>;
    try {
      updated = await this.workoutsRepository.pairExercises(planId, exerciseId, pairWithExerciseId);
    } catch (error) {
      if (error instanceof PairConflictError)
        return { outcome: 'conflict', message: error.message };
      throw error;
    }
    if (!updated) return { outcome: 'not-found' };

    const exercise = await this.workoutsRepository.findExerciseById(updated.id, planId);
    if (!exercise) return { outcome: 'not-found' };
    return { outcome: 'ok', exercise };
  }

  async unpairExercise(
    planId: string,
    exerciseId: string,
    userId: string,
  ): Promise<PairExerciseResult> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return { outcome: 'not-found' };

    let updated: Awaited<ReturnType<typeof this.workoutsRepository.unpairExercise>>;
    try {
      updated = await this.workoutsRepository.unpairExercise(planId, exerciseId);
    } catch (error) {
      if (error instanceof PairConflictError)
        return { outcome: 'conflict', message: error.message };
      throw error;
    }
    if (!updated) return { outcome: 'not-found' };

    const exercise = await this.workoutsRepository.findExerciseById(updated.id, planId);
    if (!exercise) return { outcome: 'not-found' };
    return { outcome: 'ok', exercise };
  }
}
