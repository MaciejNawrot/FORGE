import type { NextConfig } from 'next';

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Both ship raw source rather than a built dist: @acme/design-tokens for its
  // tailwind-preset/theme.native subpaths, and @acme/ui so NativeWind can see
  // real JSX later and so "use client" survives. Next transpiles them itself.
  transpilePackages: ['@acme/design-tokens', '@acme/ui'],
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
