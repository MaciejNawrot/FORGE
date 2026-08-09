# 5. `typecheck` depends on `^build`, not `^typecheck`

- Status: accepted
- Date: 2026-08-09

## Context

Internal packages are consumed through their compiled `dist/*.d.ts`, not their
source. The `typecheck` task originally declared `dependsOn: ["^typecheck"]`,
which type-checks dependencies but never rebuilds them.

That silently broke the guarantee this whole repo is built around. Renaming a
field in `packages/contracts` and running `pnpm typecheck` reported **9 of 9
tasks successful** — both apps had been checked against a stale
`contracts/dist/index.d.ts` left over from an earlier build. A contract change
could have shipped with the apps out of sync, and CI would have been green.

## Decision

`typecheck` declares `dependsOn: ["^build"]`, matching `test`.

## Consequences

- Dependencies' `.d.ts` files are always current before a consumer is checked,
  so a contract change fails the apps immediately.
- Verified by renaming `userSchema.name` to `fullName`: `apps/api` fails in
  `users.service.ts` and `apps/web` fails in `users/page.tsx`. The README
  walks through this.
- `typecheck` now costs a dependency build on a cold cache. With Turborepo
  caching this is close to free on warm runs, and correctness here is worth
  more than the seconds saved.

## Caveat worth knowing

Not every schema edit breaks every consumer, and it would be wrong to claim
otherwise. Adding a *required input* field to `createUserInputSchema` breaks
`apps/api` but **not** `apps/web`, because the web form derives its type from
the schema generically (`z.infer<typeof createUserInputSchema>`) and simply
carries the new field through. Renaming a field on a *response* schema breaks
both, because both read that field by name.
