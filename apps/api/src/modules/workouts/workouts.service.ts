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
import { WorkoutsRepository } from './workouts.repository.js';

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
    return this.workoutsRepository.addExercise({
      planId,
      name: input.name,
      sets: input.sets,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      position,
    });
  }

  async updateExercise(
    planId: string,
    exerciseId: string,
    userId: string,
    input: UpdateWorkoutExerciseInput,
  ): Promise<WorkoutExercise | undefined> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return undefined;
    return this.workoutsRepository.updateExercise(exerciseId, planId, input);
  }

  async removeExercise(planId: string, exerciseId: string, userId: string): Promise<boolean> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return false;
    return this.workoutsRepository.removeExercise(exerciseId, planId);
  }
}
