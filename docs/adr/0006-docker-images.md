# 6. Docker images: `turbo prune` + `pnpm deploy`, runtime-configurable proxy

- Status: accepted
- Date: 2026-08-09

## Context

Both apps need images that build from a pnpm workspace without shipping the
whole monorepo, and that can be built once and run against different hosts.

## Decision

- Both Dockerfiles start with `turbo prune <app> --docker`, so an unrelated
  package's change cannot invalidate the install layer.
- `Dockerfile.api` uses `pnpm deploy --prod --config.inject-workspace-packages=true`
  to emit a self-contained runtime directory.
- `Dockerfile.web` ships Next's `output: 'standalone'` bundle, with
  `outputFileTracingRoot` set to the workspace root.
- `apps/web` proxies `/api/backend/*` with a **route handler**, not a
  Next.js `rewrite`.

## Consequences

### The proxy had to stop being a rewrite

Rewrite destinations are resolved at build time and baked into
`routes-manifest.json`. The built image contained a literal
`http://localhost:3001/:path*`, so a container given `API_URL=http://api:3001`
still tried to reach its own localhost and returned 500s — the image was
pinned to whatever host it was built with. A route handler reads
`process.env.API_URL` per request, so one image works everywhere. It also
still keeps the session cookie first-party, so no CORS setup is needed.

### Image sizes

Web is ~283MB. API is ~966MB, which is larger than it should be, and the
cause is understood: better-auth declares `next` as an *optional peer*,
`apps/web` satisfies it, and pnpm bakes that resolution into the lockfile key
that `turbo prune` copies verbatim. Roughly 300MB of the API image is Next.js
and friends that the API never imports.

Rejected workarounds:

- `pnpm deploy --legacy` produces a 138MB bundle, but its workspace symlinks
  point outside the deploy directory and the workspace packages' own
  dependencies are unreachable, so it cannot stand alone.
- `pnpm prune --prod` in a workspace root purges `node_modules` outright
  rather than trimming it.
- Disabling `auto-install-peers` / `resolve-peers-from-workspace-root` and
  regenerating the lockfile does not change the resolution.
- Deleting the unused trees post-install would work today and break silently
  the first time better-auth lazily requires one of them.

Splitting the workspace so the API's graph never sees a Next.js app would fix
it properly; that is a bigger change than this starter warrants.

### Other notes

- The root `prepare` script is `lefthook install || true` — git is absent in
  the build container and a hard failure there stops `pnpm install`.
- User creation happens *before* `COPY --chown`; a trailing `RUN chown -R`
  rewrites every file's metadata and duplicates the whole tree into a second
  layer (~150MB here).
- CI builds both images on every PR, so the Dockerfiles cannot rot unnoticed.
