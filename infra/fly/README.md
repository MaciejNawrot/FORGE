# infra/fly

`api.toml` config for the `@acme/api` Fly app. One-time setup:

```bash
flyctl auth login
flyctl apps create gym0-api                      # match `app` in api.toml
flyctl secrets set -a gym0-api \
  DATABASE_URL=postgres://... \
  BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  BETTER_AUTH_URL=https://gym0-api.fly.dev \
  CORS_ORIGIN=https://<your-vercel-domain> \
  BETTER_AUTH_TRUSTED_ORIGINS=https://<your-vercel-domain>
```

Then add `FLY_API_TOKEN` (`flyctl tokens create deploy -a gym0-api`) and
`PROD_DATABASE_URL` (same value as the `DATABASE_URL` secret above, used by
CI to run migrations before the image ships) as GitHub Actions repo secrets.
After that, every push to `main` that passes CI deploys automatically — see
`.github/workflows/ci.yml`'s `deploy-api` job.

Web isn't deployed from here: import the repo into Vercel with **Root
Directory = `apps/web`**, framework preset Next.js. It auto-detects the pnpm
workspace, builds `@acme/web` and its `packages/*` deps, and redeploys on
every push to `main` (plus a preview URL per PR) with no workflow file
needed. Set one env var on the Vercel project: `API_URL` = the Fly app's
public URL (`https://gym0-api.fly.dev`).
