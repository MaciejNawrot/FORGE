import { createApiClient } from '@acme/api-client';

/**
 * Browser-side client. Talks to the same origin via the `/api/backend/*`
 * rewrite in next.config.ts, so first-party cookies (the better-auth
 * session) are sent automatically — no CORS involved.
 */
export const apiClient = createApiClient({
  baseUrl: '/api/backend',
});
