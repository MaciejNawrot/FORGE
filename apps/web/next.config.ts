import type { NextConfig } from 'next';

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // @acme/design-tokens ships its tailwind-preset/theme.native subpaths as raw
  // .ts source (no build step of its own) — Next needs to transpile it itself.
  transpilePackages: ['@acme/design-tokens'],
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
