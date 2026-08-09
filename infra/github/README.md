# infra/github

Reusable CI pieces live in `.github/`, because GitHub Actions only resolves
composite actions and workflows from that directory:

- **`.github/actions/setup`** — the composite action every job uses: pnpm,
  Node (pinned via `.node-version`), the pnpm store cache, `pnpm install
  --frozen-lockfile`, and optionally the Turborepo cache
  (`with: turbo-cache: "true"`).
- **`.github/workflows/ci.yml`** — the pipeline itself.

This directory holds anything CI-related that is *not* required to sit under
`.github/` — deployment manifests, environment matrices, release scripts —
so it stays alongside `infra/docker/` rather than being scattered.

## The pipeline

| Job | What it does |
| --- | --- |
| `ci` | lint → boundaries → typecheck → test → build → build-storybook, with the Turborepo cache restored |
| `e2e` | runs the API e2e suite against a real Postgres service container, after applying migrations |
| `docker` | builds both app images so the Dockerfiles cannot rot unnoticed |
| `commitlint` | validates Conventional Commit messages on PRs |

`typecheck` is deliberately part of the same job as `build`, and depends on
`^build` in `turbo.json`, so both apps are always checked against freshly
compiled contract types — see
[ADR 0005](../../docs/adr/0005-typecheck-depends-on-build.md).
