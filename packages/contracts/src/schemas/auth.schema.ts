import { z } from 'zod';

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

// The authenticated identity, as managed by better-auth — distinct from the
// `users` business resource in user.schema.ts (different id format, no
// email/name-only shape; better-auth owns id/emailVerified/image).
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const sessionSchema = z.object({
  user: authUserSchema,
  expiresAt: z.coerce.date(),
});
export type Session = z.infer<typeof sessionSchema>;
