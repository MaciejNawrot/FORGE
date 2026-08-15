import { createApiClient } from '@acme/api-client';
import { cookies } from 'next/headers';
import { buildCookieHeader } from './build-cookie-header';

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

/**
 * Server-side client for use in Server Components / Server Actions. Calls
 * the API directly (bypassing the Next.js rewrite, which only intercepts
 * real browser requests) and forwards the incoming request's cookies
 * manually so SSR renders with the same session as the browser.
 */
export async function getServerApiClient() {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore.getAll());

  return createApiClient({
    baseUrl: apiUrl,
    credentials: 'omit',
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}
