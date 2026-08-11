import { z } from 'zod';
import { exerciseSchema } from './exercise.schema.js';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const trainingTypeSchema = z.enum(['strength', 'cardio', 'mobility', 'rest']);
export type TrainingTypeValue = z.infer<typeof trainingTypeSchema>;

export const trainingSessionExerciseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exercise: exerciseSchema,
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  position: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSessionExercise = z.infer<typeof trainingSessionExerciseSchema>;

export const addTrainingSessionExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type AddTrainingSessionExerciseInput = z.infer<typeof addTrainingSessionExerciseInputSchema>;

export const trainingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  date: z.string(),
  type: trainingTypeSchema,
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSession = z.infer<typeof trainingSessionSchema>;

export const trainingSessionWithExercisesSchema = trainingSessionSchema.extend({
  exercises: z.array(trainingSessionExerciseSchema),
});
export type TrainingSessionWithExercises = z.infer<typeof trainingSessionWithExercisesSchema>;

export const createTrainingSessionInputSchema = z.object({
  date: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
  type: trainingTypeSchema,
  notes: z.string().max(2000).nullable().optional(),
});
export type CreateTrainingSessionInput = z.infer<typeof createTrainingSessionInputSchema>;

export const listTrainingSessionsQuerySchema = z.object({
  from: z.string().regex(isoDatePattern).optional(),
  to: z.string().regex(isoDatePattern).optional(),
});
export type ListTrainingSessionsQuery = z.infer<typeof listTrainingSessionsQuerySchema>;

export const trainingSessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type TrainingSessionIdParams = z.infer<typeof trainingSessionIdParamsSchema>;

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
});
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;

export const trainingSessionExerciseParamsSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});
export type TrainingSessionExerciseParams = z.infer<typeof trainingSessionExerciseParamsSchema>;
