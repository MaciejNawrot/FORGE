/**
 * Bridges Set-Cookie headers from a headless library call (better-auth's
 * `auth.api.*`, called outside Fastify's own request/response cycle) onto the
 * actual Fastify response.
 *
 * We can't inject `@Res()` into a `@TsRestHandler`-decorated controller
 * method to set headers directly: ts-rest's own TsRestHandlerInterceptor
 * calls `res.status()` on the raw reply itself, and combining that with
 * Nest's `@Res()` response-handling detection reliably hangs the response
 * (verified: request completes, body is computed, but the client never
 * receives it). Stashing the cookies here and applying them in a Fastify
 * `onSend` hook (registered in AppModule.onModuleInit) sidesteps that
 * interaction entirely.
 */
const pendingSetCookies = new WeakMap<object, string[]>();

export function stashSetCookies(request: object, headers: Headers): void {
  const cookies = headers.getSetCookie();
  if (cookies.length > 0) {
    pendingSetCookies.set(request, cookies);
  }
}

export function popSetCookies(request: object): string[] | undefined {
  const cookies = pendingSetCookies.get(request);
  pendingSetCookies.delete(request);
  return cookies;
}
