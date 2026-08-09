# @acme/mobile — not built yet

This directory is a placeholder. Nothing here is wired into the workspace: it
is excluded from `pnpm-workspace.yaml` globs only by having no
`package.json`, and Biome is configured to ignore `apps/mobile`.

The rest of the repo has been kept ready for it, so this should be additive
rather than a refactor.

## Intended stack

- **Expo SDK** (managed workflow) + **Expo Router** — file-based routing that
  mirrors `apps/web`'s App Router layout.
- **NativeWind v4** — the same Tailwind class strings as web.
- **TanStack Query** — same data-fetching model as web.
- `@acme/api-client`, `@acme/ui`, `@acme/design-tokens`, `@acme/contracts`.

## Setup sketch

```bash
cd apps
pnpm create expo-app mobile --template
cd mobile
pnpm add nativewind react-native-reanimated react-native-safe-area-context
pnpm add @acme/api-client@workspace:* @acme/ui@workspace:* \
         @acme/design-tokens@workspace:* @acme/contracts@workspace:*
```

Then:

1. **Tailwind + tokens.** Create `tailwind.config.js` using the generated
   preset, exactly as `apps/web` does:

   ```js
   const { tailwindPreset } = require('@acme/design-tokens/tailwind-preset');
   module.exports = {
     presets: [require('nativewind/preset'), tailwindPreset],
     content: [
       './app/**/*.{ts,tsx}',
       '../../packages/ui/src/**/*.{ts,tsx}', // ← required, see below
     ],
   };
   ```

2. **Theme variables.** React Native has no CSS cascade, so the custom
   properties that `variables.css` provides on web come from
   `@acme/design-tokens/theme.native` instead:

   ```tsx
   import { vars } from 'nativewind';
   import { darkVars, lightVars } from '@acme/design-tokens/theme.native';

   <View style={vars(colorScheme === 'dark' ? darkVars : lightVars)}>
     {children}
   </View>
   ```

   The same class names (`bg-primary`, `text-muted-foreground`) then resolve
   correctly on both platforms.

3. **UI primitives.** Import from the package root only:

   ```ts
   import { Button, Card, Stack, Text } from '@acme/ui';   // ✅
   import { Dialog } from '@acme/ui/web';                  // ✗ web-only, Radix
   ```

   The primitives currently render web host elements. Porting is mechanical:
   add a `.native.tsx` sibling per primitive (e.g. `button.native.tsx`)
   rendering `Pressable`/`View`/`Text` with the *same* props and the same
   `className` strings. Metro resolves `.native.tsx` first; web bundlers
   ignore it. The `cva` variant maps and `cn()` calls copy over unchanged,
   because the primitives are already class-strings-only — enforced by
   `packages/ui/src/primitives/portability.test.ts`.

4. **API client.** `@acme/api-client` is deliberately framework-agnostic and
   uses only the Fetch API, so it works as-is:

   ```ts
   export const apiClient = createApiClient({
     baseUrl: process.env.EXPO_PUBLIC_API_URL!,
   });
   ```

5. **Auth.** There is no same-origin proxy on mobile, so cookie auth does not
   apply. `packages/auth` already enables better-auth's `bearer` plugin for
   this: authenticate, keep the token in `expo-secure-store`, and send it as
   `Authorization: Bearer <token>` via the client's `headers` option.

6. **Metro + monorepo.** Metro needs to be told about the workspace root and
   that `@acme/*` packages are source, not prebuilt:

   ```js
   // metro.config.js
   config.watchFolders = [monorepoRoot];
   config.resolver.nodeModulesPaths = [
     path.resolve(projectRoot, 'node_modules'),
     path.resolve(monorepoRoot, 'node_modules'),
   ];
   ```

## Constraints already respected by the shared packages

- No `window`/`document` outside `packages/ui/src/web` (asserted by a test).
- No Node-only dependencies in `contracts` or `api-client`.
- `@acme/ui` ships source so NativeWind's transform can see real JSX —
  see [ADR 0004](../../docs/adr/0004-ui-ships-source.md).
- Tokens already emit a React Native theme (`theme.native.ts`) alongside the
  web CSS variables.

## Things that will need attention

- `@acme/db` and `@acme/auth` are server-only; never import them here.
- Add `apps/mobile` to CI once it has a `package.json`, and remove the Biome
  ignore entry in `biome.json`.
