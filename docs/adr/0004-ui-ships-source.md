# 4. `@acme/ui` ships source; primitives are split from web-only components

- Status: accepted
- Date: 2026-08-09

## Context

`packages/ui` has to serve a Next.js app today and an Expo/NativeWind app
later, from the same component definitions. Every other package in this
repo compiles to `dist/` with tsup.

## Decision

1. `@acme/ui` has no build step. Its `exports` point directly at `.tsx`
   source and consumers transpile it.
2. It exposes two entrypoints: `@acme/ui` (cross-platform primitives) and
   `@acme/ui/web` (Radix dialogs, tables — anything DOM-bound).

## Consequences

- NativeWind processes `className` props from source at build time; a
  pre-bundled `dist` would already have passed through a non-RN-aware
  transform, which would defeat the whole reason this package is split.
- `"use client"` directives survive, rather than being hoisted or dropped by
  a bundler combining modules.
- Because `src/web` is unreachable from `src/index.ts`, a React Native bundle
  importing the package root *cannot* pull in Radix. The split is enforced by
  the module graph, not by convention.
- Consumers must add `@acme/ui` to `transpilePackages` **and** to their
  Tailwind `content` globs. Missing the second one produces unstyled
  components with no error at all, so it is called out in
  `docs/design-system.md`.
- The portability rules for `src/primitives` (Tailwind classes only, no DOM
  APIs, no inline styles, no Radix) are enforced by
  `src/primitives/portability.test.ts`, which reads the source files. A rule
  that is only a comment drifts on the first deadline.
