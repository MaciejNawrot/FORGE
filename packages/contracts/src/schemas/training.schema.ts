import { z } from 'zod';
import { exerciseSchema } from './exercise.schema.js';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const trainingTypeSchema = z.enum(['strength', 'cardio', 'mobility', 'rest']);
export type TrainingTypeValue = z.infer<typeof trainingTypeSchema>;

export const trainingSessionSetSchema = z.object({
  id: z.string().uuid(),
  sessionExerciseId: z.string().uuid(),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  position: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSessionSet = z.infer<typeof trainingSessionSetSchema>;

export const trainingSessionExerciseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exercise: exerciseSchema,
  notes: z.string().max(2000).nullable(),
  restSeconds: z.number().int().min(0).nullable(),
  position: z.number().int().min(0),
  sets: z.array(trainingSessionSetSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSessionExercise = z.infer<typeof trainingSessionExerciseSchema>;

export const addTrainingSessionExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type AddTrainingSessionExerciseInput = z.infer<typeof addTrainingSessionExerciseInputSchema>;

export const updateTrainingSessionSetInputSchema = z.object({
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable(),
});
export type UpdateTrainingSessionSetInput = z.infer<typeof updateTrainingSessionSetInputSchema>;

export const updateSessionExerciseNotesInputSchema = z.object({
  notes: z.string().max(2000).nullable(),
});
export type UpdateSessionExerciseNotesInput = z.infer<typeof updateSessionExerciseNotesInputSchema>;

export const updateSessionExerciseRestInputSchema = z.object({
  restSeconds: z.number().int().min(0),
});
export type UpdateSessionExerciseRestInput = z.infer<typeof updateSessionExerciseRestInputSchema>;

export const trainingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  planId: z.string().uuid().nullable(),
  date: z.string(),
  type: trainingTypeSchema,
  notes: z.string().nullable(),
  durationSeconds: z.number().int().min(0).nullable(),
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
  planId: z.string().uuid().nullable().optional(),
});
export type CreateTrainingSessionInput = z.infer<typeof createTrainingSessionInputSchema>;

export const finishTrainingSessionInputSchema = z.object({
  durationSeconds: z.number().int().min(0),
});
export type FinishTrainingSessionInput = z.infer<typeof finishTrainingSessionInputSchema>;

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

export const trainingSessionSetParamsSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setId: z.string().uuid(),
});
export type TrainingSessionSetParams = z.infer<typeof trainingSessionSetParamsSchema>;

export const lastPerformanceEntrySchema = z.object({
  exerciseId: z.string().uuid(),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  restSeconds: z.number().int().min(0).nullable(),
  date: z.string(),
});
export type LastPerformanceEntry = z.infer<typeof lastPerformanceEntrySchema>;

export const lastPerformanceQuerySchema = z.object({
  // Comma-separated exercise ids, e.g. "id-1,id-2".
  exerciseIds: z.string().min(1),
});
export type LastPerformanceQuery = z.infer<typeof lastPerformanceQuerySchema>;
