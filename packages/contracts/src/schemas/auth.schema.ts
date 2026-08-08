import { z } from 'zod';
import { userSchema } from './user.schema.js';

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const sessionSchema = z.object({
  user: userSchema,
  expiresAt: z.coerce.date(),
});
export type Session = z.infer<typeof sessionSchema>;
