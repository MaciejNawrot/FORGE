# 3. Set-Cookie bridged via a Fastify onSend hook, not `@Res()`

- Status: accepted
- Date: 2026-08-09

## Context

better-auth's server API returns `Set-Cookie` values on a `Headers` object
rather than writing them to the response, so they must be copied onto the
Fastify reply. The obvious way is to inject the reply with
`@Res({ passthrough: true })` and call `reply.header(...)`.

That does not work. `@TsRestHandler`'s interceptor already calls
`res.status()` on the raw reply, and combining that with Nest's `@Res()`
response-handling detection hangs the request: the handler runs to completion,
the body is computed, and the client never receives anything. Injecting
`@Res()` is enough to trigger it — the parameter does not have to be used.

## Decision

Do not inject `@Res()` into ts-rest handlers. Stash the cookies in a
`WeakMap` keyed by the (safe to inject) `@Req()` request, and apply them in a
Fastify `onSend` hook. See `apps/api/src/common/fastify-cookie-bridge.ts`.

Register the hook in `AppModule`'s `onModuleInit` via `HttpAdapterHost`, not
in `main.ts`.

## Consequences

- Responses complete normally, and multi-value `Set-Cookie` works (logout
  clears three cookies).
- Registering in `AppModule` rather than `main.ts` matters: e2e tests build
  the app from `AppModule` via `TestingModule` and never execute `main.ts`, so
  a hook registered during bootstrap silently never runs under test — which
  is exactly how this was first shipped, and how it was caught.
- Anything else needing raw response access in a ts-rest route must use the
  same hook pattern.
