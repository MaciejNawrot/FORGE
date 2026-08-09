import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts', 'src/migrate.ts', 'src/seed.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  // Never clean in watch mode: consumers' watchers (nest/next) read this
  // dist, and wiping it on startup gives them a window where index.d.ts is
  // missing — which they report as errors and never retry.
  clean: !options.watch,
  splitting: false,
  treeshake: true,
}));
