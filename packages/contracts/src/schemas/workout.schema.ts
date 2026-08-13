import { z } from 'zod';
import { trainingTypeSchema } from './training.schema.js';

export const workoutExerciseSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  position: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const createWorkoutExerciseInputSchema = z.object({
  name: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type CreateWorkoutExerciseInput = z.infer<typeof createWorkoutExerciseInputSchema>;

export const updateWorkoutExerciseInputSchema = createWorkoutExerciseInputSchema.partial();
export type UpdateWorkoutExerciseInput = z.infer<typeof updateWorkoutExerciseInputSchema>;

export const workoutPlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1).max(120),
  notes: z.string().max(2000).nullable(),
  category: trainingTypeSchema.nullable(),
  isTemplate: z.boolean(),
  forkedFromId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;

export const workoutPlanWithExercisesSchema = workoutPlanSchema.extend({
  exercises: z.array(workoutExerciseSchema),
});
export type WorkoutPlanWithExercises = z.infer<typeof workoutPlanWithExercisesSchema>;

export const workoutPlanListItemSchema = workoutPlanSchema.extend({
  exerciseCount: z.number().int().min(0),
});
export type WorkoutPlanListItem = z.infer<typeof workoutPlanListItemSchema>;

export const createWorkoutPlanInputSchema = z.object({
  name: z.string().min(1).max(120),
  notes: z.string().max(2000).nullable().optional(),
  category: trainingTypeSchema.nullable().optional(),
});
export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanInputSchema>;

export const updateWorkoutPlanInputSchema = createWorkoutPlanInputSchema.partial();
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanInputSchema>;

export const workoutPlanIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type WorkoutPlanIdParams = z.infer<typeof workoutPlanIdParamsSchema>;

export const workoutExerciseParamsSchema = z.object({
  planId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});
export type WorkoutExerciseParams = z.infer<typeof workoutExerciseParamsSchema>;

export const planIdParamsSchema = z.object({
  planId: z.string().uuid(),
});
export type PlanIdParams = z.infer<typeof planIdParamsSchema>;
