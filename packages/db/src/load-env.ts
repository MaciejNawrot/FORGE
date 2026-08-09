import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/**
 * Loads the repository-root `.env` for the CLI entrypoints (migrate, seed).
 *
 * These run with their cwd set to `packages/db` (pnpm --filter), so a bare
 * `dotenv/config` would look for `packages/db/.env` and find nothing —
 * `pnpm db:migrate` then failed env validation on a fresh clone. DATABASE_URL
 * is shared with apps/api, so it lives once at the root rather than being
 * duplicated into a third env file that can drift.
 *
 * Both `src/` and `dist/` sit two levels below the package root, so the same
 * relative path works before and after compilation. A package-local `.env`
 * still wins if present, and real environment variables always win — dotenv
 * never overwrites what is already set.
 */
const here = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(here, '../../../.env') });
config();
