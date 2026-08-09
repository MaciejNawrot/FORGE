# Conventions

## Hard rules

1. **Request/response shapes live only in `packages/contracts`.** No DTO
   classes, no duplicated interfaces, no hand-written client types. If you
   need a shape in two places, it belongs in the contract.
2. **`packages/ui` and `packages/utils` never import from `apps/*`.** Enforced
   by `pnpm boundaries` in CI.
3. **Business logic lives in services, not controllers or components.**
   Controllers translate HTTP; components render. All SQL lives in
   repositories.
4. **No `any`, no `@ts-ignore`.** `noExplicitAny` is an error in Biome. If a
   type is genuinely unknown, use `unknown` and narrow it.

## Adding a feature end to end

1. Add or edit the Zod schema in `packages/contracts/src/schemas/`.
2. Add the route to the relevant contract in `src/contracts/`.
3. `pnpm typecheck` — both apps now fail where they are out of date.
4. Implement in `apps/api`: repository → service → controller handler.
5. Consume in `apps/web` via `apiClient` (browser) or `getServerApiClient()`
   (Server Components).
6. Add a `.changeset` if a published package changed.

## Module layout in apps/api

```
src/modules/<feature>/
  <feature>.controller.ts   ts-rest handler, no logic
  <feature>.service.ts      business logic, framework-free where possible
  <feature>.repository.ts   Drizzle queries
  <feature>.module.ts
```

Cross-cutting code (guards, filters, interceptors, pipes, decorators) goes in
`src/common/`.

### NestJS DI and `import type`

Constructor-injected classes must be **value** imports:

```ts
import { UsersService } from './users.service.js';        // ✅
import type { UsersService } from './users.service.js';   // ✗ breaks DI at runtime
```

A type-only import is erased, so the class disappears from
`design:paramtypes` and Nest cannot resolve the dependency — with no type
error. Biome's `useImportType` rule wants to "fix" exactly this pattern, so it
is turned off for `apps/api` in `biome.json`. Don't re-enable it there.

## Imports and module resolution

- Internal packages use `NodeNext`, so relative imports need the `.js`
  extension: `import { cn } from './lib/cn.js'`.
- `apps/web` uses `Bundler` resolution (Next's convention), so relative
  imports there are extensionless: `import { apiClient } from './api-client'`.
- Cross-package imports always go through the package name
  (`@acme/contracts`), never a relative path into another package.

## Environment variables

Every app and package that reads env vars validates them with
`@t3-oss/env-core` + Zod and fails at import time, not at first use. Add new
vars to the schema and to the app's `.env.example` in the same commit.

Runtime-configurable values (`API_URL`) must be read at request time. Next.js
`rewrites` bake their destination in at build time — that is why the API proxy
is a route handler.

## Styling

- Style with Tailwind classes only. No CSS-in-JS, no inline `style={{}}` in
  `packages/ui/src/primitives` (enforced by a test).
- Use semantic tokens (`bg-primary`, `text-muted-foreground`), never raw
  palette values, and never hex codes in components.
- New design values go into `packages/design-tokens/src/tokens.json` and are
  regenerated — see [design-system.md](design-system.md).

## Tests

- Unit tests sit next to the code: `*.test.ts`, or `*.spec.ts` in `apps/api`.
- API e2e tests live in `apps/api/test/*.e2e-spec.ts` and run against a real
  Postgres.
- A test that cannot fail is worse than no test. When adding a guard-style
  test, break the thing on purpose once and watch it go red.

## Commits and releases

- Conventional Commits, enforced by commitlint on commit and in CI.
- lefthook runs Biome on staged files pre-commit and typecheck + tests
  pre-push.
- Use `pnpm changeset` when a package's public surface changes.

## Dependency versions

All shared versions are pinned in the `catalog:` block of
`pnpm-workspace.yaml`. Reference them as `"zod": "catalog:"` rather than
repeating a version, so every package moves together.
