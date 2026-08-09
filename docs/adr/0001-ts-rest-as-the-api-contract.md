# 1. ts-rest as the single API contract

- Status: accepted
- Date: 2026-08-09

## Context

Request/response shapes must be defined exactly once and consumed by the
NestJS API, the Next.js web app, and eventually an Expo mobile app. The
alternative shortlisted was OpenAPI-first (`@nestjs/swagger` decorators plus
`orval` to generate a client).

## Decision

Define every route in `packages/contracts` using ts-rest with Zod schemas.
The API implements that contract through `@ts-rest/nest`, and clients consume
it through `@ts-rest/core`.

## Consequences

- No code generation step, and no generated client to keep in sync.
- NestJS gets no DTO classes and no `ValidationPipe`: validation comes from
  the contract's Zod schemas via the ts-rest interceptor. Adding
  class-validator DTOs would reintroduce a second source of truth.
- Swagger is generated *from* the contract (`@ts-rest/open-api`) rather than
  from decorators, so `/docs` cannot drift from the implementation.
- `strictStatusCodes: true` is set on the router. Without it, ts-rest's client
  types include a catch-all `{ status: <any other code>, body: unknown }`
  member, which defeats discriminated-union narrowing — every
  `if (result.status !== 200)` check leaves `body` as `unknown`.
- Pinned to Zod 3.x: ts-rest 3.52's peer range does not yet cover Zod 4.

## Notes

A contract change does not break every consumer equally — see
[ADR 0005](0005-typecheck-depends-on-build.md) and the README's
"contract change" walkthrough for what is and isn't caught.
