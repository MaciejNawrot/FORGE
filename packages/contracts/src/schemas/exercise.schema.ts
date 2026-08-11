import { z } from 'zod';

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  muscleGroups: z.array(z.string()),
  equipment: z.string(),
  description: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const listExercisesQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
});
export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
