import { z } from 'zod';

export const errorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
