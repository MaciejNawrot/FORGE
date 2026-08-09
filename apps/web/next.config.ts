import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Both ship raw source rather than a built dist: @acme/design-tokens for its
  // tailwind-preset/theme.native subpaths, and @acme/ui so NativeWind can see
  // real JSX later and so "use client" survives. Next transpiles them itself.
  transpilePackages: ['@acme/design-tokens', '@acme/ui'],

  // Emit a self-contained server bundle for the Docker image. In a monorepo
  // the trace root must be the workspace root, or Next only traces files
  // under apps/web and the workspace deps go missing at runtime.
  output: 'standalone',
  outputFileTracingRoot: join(here, '../../'),

  // Note: /api/backend/* is proxied by a route handler, not a rewrite —
  // rewrite destinations are baked in at build time, which would pin a
  // container image to one API host. See src/app/api/backend/[...path]/route.ts.
};

export default nextConfig;
