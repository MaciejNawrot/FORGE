# GYM0

A TypeScript monorepo: NestJS (Fastify) API, Next.js web app, and a shared
contract that both are type-checked against.

```
apps/api    NestJS 11 + Fastify + Drizzle + better-auth
apps/web    Next.js 16 App Router + TanStack Query + Tailwind v4
apps/mobile placeholder (see apps/mobile/README.md)
packages/   contracts · api-client · auth · db · ui · design-tokens · config · utils
```

## Day one

**Requirements:** Node 22, pnpm 11, Docker.

```bash
# 1. install
pnpm install

# 2. start Postgres + Redis
pnpm docker:up

# 3. create the env files
#    (the root one holds DATABASE_URL, shared by the db tooling and the API)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. set up the database
pnpm db:migrate
pnpm db:seed

# 5. run everything
pnpm dev
```

- web → <http://localhost:3000>
- api → <http://localhost:3001>
- api docs → <http://localhost:3001/docs>
- health → <http://localhost:3001/health>

Open <http://localhost:3000/users> — the list is server-rendered from Postgres,
and the form below it creates a user through the API. <http://localhost:3000/login>
registers or signs in.

### Checks

```bash
pnpm lint        # Biome
pnpm typecheck   # tsc across the graph
pnpm test        # unit tests (Vitest)
pnpm build       # everything
pnpm boundaries  # dependency-direction rules
```

API e2e tests need the database running:

```bash
pnpm --filter @acme/api test:e2e
```

Storybook for the design system:

```bash
pnpm --filter @acme/ui storybook     # http://localhost:6006
```

## The contract is the source of truth

`packages/contracts` defines every request and response once, in Zod.
`apps/api` implements it through ts-rest, `apps/web` consumes it through
`@acme/api-client`, and Swagger is generated from it. There are no DTO
classes and no generated client to keep in sync.

**Try breaking it.** Rename a field on the shared `User` response:

```diff
  // packages/contracts/src/schemas/user.schema.ts
  export const userSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
-   name: z.string().min(1).max(120),
+   fullName: z.string().min(1).max(120),
```

Then:

```bash
pnpm typecheck
```

Both apps fail until they are updated:

```
@acme/api:typecheck: src/modules/users/users.service.ts(44,7): error TS2741:
  Property 'fullName' is missing in type
  '{ name: string; email: string; id: string; createdAt: Date; updatedAt: Date; }'
  but required in type
  '{ email: string; id: string; createdAt: Date; updatedAt: Date; fullName: string; }'.

@acme/web:typecheck:  src/app/users/page.tsx(30,38): error TS2339:
  Property 'name' does not exist on type
  '{ email: string; id: string; createdAt: Date; updatedAt: Date; fullName: string; }'.
```

This works because `typecheck` depends on `^build`, so both apps are checked
against freshly compiled contract types rather than a stale `dist`. That was
not true at first, and the bug was invisible — a rename reported *9 of 9 tasks
successful*. See [ADR 0005](docs/adr/0005-typecheck-depends-on-build.md).

One honest caveat: not every edit breaks every consumer. Adding a **required
input** field breaks `apps/api` but not `apps/web`, because the web form
derives its type from the schema generically and just carries the new field
through. Renaming a **response** field breaks both, because both read it by
name.

## Common tasks

| Task | Command |
| --- | --- |
| Start / stop services | `pnpm docker:up` / `pnpm docker:down` |
| Generate a migration | `pnpm db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Seed | `pnpm db:seed` |
| Browse data | `pnpm db:studio` |
| Rebuild design tokens | `pnpm --filter @acme/design-tokens tokens:build` |
| Regenerate auth tables | `pnpm --filter @acme/auth auth:generate` |
| Add a changeset | `pnpm changeset` |

## Running the full stack in Docker

`pnpm dev` is the normal loop. To run the built images instead:

```bash
cd infra/docker
docker compose --profile full up --build
```

Both images build from a `turbo prune`d subset of the workspace, so an
unrelated package cannot invalidate their install layers. `API_URL` is read at
request time, so one web image works against any API host — see
[ADR 0006](docs/adr/0006-docker-images.md).

## Documentation

- [docs/architecture.md](docs/architecture.md) — how the pieces fit, request flow
- [docs/conventions.md](docs/conventions.md) — day-to-day rules and gotchas
- [docs/design-system.md](docs/design-system.md) — tokens, Stitch imports, Storybook
- [docs/adr/](docs/adr/) — decisions and the reasoning behind them

## Gotchas worth knowing up front

Each of these cost real debugging time and is documented where it bites:

- **NestJS DI breaks with `import type`.** A type-only import of an injected
  class erases it from decorator metadata — runtime failure, no type error.
  Biome's `useImportType` is disabled for `apps/api` for this reason.
- **Tailwind must scan `packages/ui/src`.** Missing that content glob yields
  unstyled components with no error at all.
- **Next `rewrites` bake their destination at build time.** That is why the
  API proxy is a route handler.
- **`@Res()` inside a ts-rest handler hangs the response.** Cookies are
  bridged through a Fastify `onSend` hook instead.

## Licence

UNLICENSED — private.
