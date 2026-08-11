import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().default('http://localhost:3001'),
    // Extra origins allowed to drive auth, comma-separated. better-auth
    // rejects requests whose Origin doesn't match baseURL, so any additional
    // host the browser talks to — a preview deploy, a tunnel used for phone
    // testing — has to be listed here.
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  },
  runtimeEnv: process.env,
});
