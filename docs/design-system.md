# Design system

The design system has two halves that meet at a single file:

- **`packages/design-tokens`** owns *values* (color, spacing, radius, type).
  Everything is generated from one source file.
- **`packages/ui`** owns *components*, styled only by referencing those
  generated values through Tailwind classes.

## Where a Google Stitch export goes

**Paste into: `packages/design-tokens/src/tokens.json`**

That file is the single ingestion point. Nothing else in the repo hardcodes a
color or a spacing value — the CSS variables, the Tailwind preset, and the
React Native theme are all generated from it.

Then run:

```bash
pnpm --filter @acme/design-tokens tokens:build
```

Or just `pnpm build`, which runs it as part of the graph.

### Mapping a Stitch export onto tokens.json

Stitch exports Tailwind/HTML, so you get concrete values (`#2563eb`,
`0.5rem`) rather than token names. Translate them into the existing shape:

- **Raw palette values** go under `palette.*` — these are the literal colors
  from the export (`palette.blue.600`, `palette.neutral.200`, …).
- **Semantic roles** go under `color.light.*` / `color.dark.*` and *reference*
  the palette with `{palette.blue.600}` syntax. Components only ever use
  semantic names, never raw palette entries.
- **Scales** (`spacing`, `radius`, `font`) are flat value maps.

Keep the semantic key set stable (`background`, `foreground`, `primary`,
`primaryForeground`, `border`, `muted`, `destructive`, …). Components are
written against those names, so changing a *value* is a no-op for component
code, while renaming a *key* is a breaking change.

Two constraints the file format imposes:

- Token keys must not contain a literal `.` — Style Dictionary treats dots as
  path separators for its `{a.b.c}` reference syntax. Tailwind's `spacing.0.5`
  is therefore stored as `0_5` and converted back to `0.5` by the build.
- Values use the DTCG `{ "$value": ..., "$type": ... }` shape.

### What the build emits

`pnpm tokens:build` writes three artifacts into `packages/design-tokens/dist/`:

| Output | Consumed by | Contains |
| --- | --- | --- |
| `variables.css` | web (`apps/web`), Storybook | `:root` + `[data-theme="dark"]` custom properties |
| `tailwind-preset.ts` | web **and** mobile | semantic colors as `var(--color-*)`, plus the static spacing/radius/type scales |
| `theme.native.ts` | mobile (NativeWind) | `lightVars` / `darkVars` maps to feed NativeWind's `vars()` |

Web gets its custom properties from the CSS cascade. React Native has no
cascade, so `theme.native.ts` provides the same variables as objects for
NativeWind's `vars()` helper — the same Tailwind class names then resolve
correctly on both platforms.

## packages/ui layout

```
src/
├── lib/cn.ts         # clsx + tailwind-merge (pure strings, no DOM)
├── primitives/       # cross-platform: Button, Input, Text, Stack, Card
└── web/              # web-only: Dialog (Radix), Table
```

Two entrypoints enforce the split at import time:

```ts
import { Button, Stack } from '@acme/ui';       // safe on web + React Native
import { Dialog, Table } from '@acme/ui/web';   // web only
```

A React Native bundle importing the package root can never reach the Radix
code, because it is not reachable from `src/index.ts`.

### Rules for `src/primitives`

1. Style **only** with Tailwind class strings. No inline `style={{}}`, no
   CSS-in-JS.
2. No DOM APIs (`document`, `window`).
3. No imports from `../web` or from web-only libraries.
4. Layout via flexbox only — React Native has no grid or float.

Rules 1–3 are enforced by `src/primitives/portability.test.ts`, which reads
the source files and fails the build on a violation. They are not just
convention.

### Adding React Native later

The primitives currently render web host elements (`<button>`, `<div>`). The
port is mechanical: add a `.native.tsx` sibling next to each primitive
(`button.native.tsx`) rendering `Pressable`/`View`/`Text`, keeping the exact
same props and `className` strings. Metro resolves `.native.tsx` first;
bundlers for web ignore it. Because styling is already class-strings-only,
the class logic (`cva` variants, `cn`) is copied over unchanged.

## Storybook

```bash
pnpm --filter @acme/ui storybook        # dev server on :6006
pnpm --filter @acme/ui build-storybook  # static build
```

The **Design tokens → Overview** story renders swatches and scales derived
from the generated preset at runtime, so it cannot drift from `tokens.json`.
The toolbar **Theme** control flips `data-theme` on the story wrapper, which
exercises the real dark-mode custom properties rather than a Storybook mock.

## Why packages/ui ships source, not a build

Unlike the other packages, `@acme/ui` has no `dist/`. Its `exports` point
straight at `.tsx` source, and consumers transpile it (`transpilePackages`
in `apps/web`; Vite handles it natively in Storybook).

Two reasons:

1. **NativeWind** processes `className` props at build time from source. A
   pre-bundled `dist` would already have been through a non-RN-aware
   transform, breaking the mobile story this package exists to enable.
2. **`"use client"` directives** survive intact. Bundlers routinely hoist or
   drop directives when combining modules, which silently breaks React
   Server Components.

The cost is that consumers must add `@acme/ui` to `transpilePackages` and
include its source in their Tailwind `content` globs — both already done in
`apps/web`, and both documented here because forgetting the second one
produces *unstyled components with no error*.
