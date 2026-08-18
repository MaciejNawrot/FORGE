import { createApiClient } from '@acme/api-client';

/**
 * Browser-side client. Talks to the same origin via the `/api/backend/*`
 * rewrite in next.config.ts, so first-party cookies (the better-auth
 * session) are sent automatically — no CORS involved.
 */
export const apiClient = createApiClient({
  baseUrl: '/api/backend',
});

/** Unwraps a ts-rest response, throwing the server's error message on a non-ok status. */
export function unwrapResult<T extends { status: number; body: unknown }, S extends T['status']>(
  result: T,
  okStatus: S,
): Extract<T, { status: S }>['body'] {
  if (result.status !== okStatus) throw new Error((result.body as { message: string }).message);
  return result.body as Extract<T, { status: S }>['body'];
}
