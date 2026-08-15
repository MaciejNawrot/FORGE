# apps/web Feature-Based Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `apps/web/src` from a flat `components/` + `lib/` into `features/`, `shared/`, `utils/`, per the approved design at `docs/superpowers/specs/2026-08-15-web-feature-structure-design.md`. Pure move + import-path rewrite + two file splits. Zero behavior change.

**Architecture:** Every file's destination was determined by grepping its actual consumers (not guessed) — 1 feature route → that feature; 2+ features or app shell → `shared/`; pure stateless helper → `utils/`. Each feature and each `shared/` subfolder exposes a barrel `index.ts`; app pages import only from these barrels, never from a feature's internals.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@acme/ui`, TanStack Query, Zustand, react-hook-form + Zod, Biome, Vitest.

## Global Constraints

- No behavior change. Every moved file's contents are byte-identical except import paths (and the two named splits below).
- Use `git mv` for every relocation so history is preserved — never delete-and-recreate.
- `apps/web` uses Next's Bundler resolution: relative imports stay extensionless (`./foo`, not `./foo.ts`). See `docs/conventions.md`.
- New cross-feature/shared imports go through the barrel (`@/shared/api`, `@/shared/components`, `@/shared/hooks`, `@/utils`, `@/features/<name>`) — never a deep path into another feature's internals. `@/shared/i18n/*` is the one exception: it has no barrel, keep importing its specific submodule (`@/shared/i18n/context`, `@/shared/i18n/server`, `@/shared/i18n/locales`) exactly as today, just with the new alias prefix.
- `'use client'` stays only at the top of each split folder's `index.tsx` (the file a Server Component page imports transitively through the barrel). Sibling files inside that same component folder do **not** get their own `'use client'` — they're only ever reached through `index.tsx`, which already marks the boundary. Do not add it to them.
- After every task: run `pnpm --filter @acme/web typecheck`. It must pass with zero errors before moving to the next task. This is the task's test — a pure move with no behavior change is "correct" exactly when the compiler agrees every reference still resolves.
- Two files with uncommitted local changes exist at the start of this plan: `apps/web/src/app/exercises/page.tsx` and `apps/web/src/components/exercise-picker.tsx`. Task 6 and Task 8 move/edit these — read their current on-disk content before editing (don't assume the content shown in this plan is exactly current), and preserve whatever uncommitted changes are already there; only the import lines and file location change.

---

## Task 1: tsconfig path aliases

**Files:**
- Modify: `apps/web/tsconfig.json`

**Interfaces:**
- Produces: `@/features/*`, `@/shared/*`, `@/utils/*` path aliases, resolving to `./src/features/*`, `./src/shared/*`, `./src/utils/*`. All later tasks depend on these.

- [ ] **Step 1: Add the three new path aliases**

In `apps/web/tsconfig.json`, change:

```json
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
```

to:

```json
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
```

- [ ] **Step 2: Verify typecheck still passes (nothing depends on the new paths yet)**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS, no changes in behavior yet.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tsconfig.json
git commit -m "chore(web): add features/shared/utils path aliases"
```

---

## Task 2: `utils/` — pure helpers

**Files:**
- Create (via `git mv`): `apps/web/src/utils/theme.ts`, `apps/web/src/utils/training-colors.ts`, `apps/web/src/utils/nav-links.ts`
- Create: `apps/web/src/utils/index.ts`
- Modify (import path only): `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/progress/page.tsx`, `apps/web/src/app/tracker/page.tsx`, `apps/web/src/components/theme-switcher.tsx`, `apps/web/src/components/add-training-form.tsx`, `apps/web/src/components/start-plan-button.tsx`, `apps/web/src/components/session-list-item.tsx`, `apps/web/src/components/training-heatmap.tsx`, `apps/web/src/components/plan-list-item.tsx`, `apps/web/src/components/template-library.tsx`, `apps/web/src/components/workout-template-detail.tsx`, `apps/web/src/components/session-detail.tsx`, `apps/web/src/components/nav.tsx`, `apps/web/src/components/bottom-nav.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `@/utils` barrel exporting everything from `theme.ts`, `training-colors.ts`, `nav-links.ts` — used by every later task that needs `noFlashThemeScript`, `DEFAULT_THEME`, `THEME_STORAGE_KEY`, `ThemeId`, `themes`, `toLocalIsoDate`, `trainingTypeStyles`, `trainingTypes`, `isNavLinkActive`, `navLinkHref`, `primaryNavLinks`.

- [ ] **Step 1: Move the three files**

```bash
cd apps/web/src
mkdir -p utils
git mv lib/theme.ts utils/theme.ts
git mv lib/training-colors.ts utils/training-colors.ts
git mv lib/nav-links.ts utils/nav-links.ts
```

None of these three files import from each other or from anything else in `lib/`, so their own contents need no edits.

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/utils/index.ts`:

```ts
export * from './theme';
export * from './training-colors';
export * from './nav-links';
```

- [ ] **Step 3: Update every consumer's import line**

In each file below, replace the old import with the new one (leave every other import untouched):

`app/layout.tsx`:
- Old: `import { noFlashThemeScript } from '@/lib/theme';`
- New: `import { noFlashThemeScript } from '@/utils';`

`app/page.tsx`:
- Old: `import { toLocalIsoDate } from '@/lib/training-colors';`
- New: `import { toLocalIsoDate } from '@/utils';`

`app/progress/page.tsx`:
- Old: `import { toLocalIsoDate } from '@/lib/training-colors';`
- New: `import { toLocalIsoDate } from '@/utils';`

`app/tracker/page.tsx`:
- Old: `import { toLocalIsoDate, trainingTypeStyles } from '@/lib/training-colors';`
- New: `import { toLocalIsoDate, trainingTypeStyles } from '@/utils';`

`components/theme-switcher.tsx`:
- Old: `import { DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeId, themes } from '@/lib/theme';`
- New: `import { DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeId, themes } from '@/utils';`

`components/add-training-form.tsx`:
- Old: `import { toLocalIsoDate, trainingTypes } from '@/lib/training-colors';`
- New: `import { toLocalIsoDate, trainingTypes } from '@/utils';`

`components/start-plan-button.tsx`:
- Old: `import { toLocalIsoDate } from '@/lib/training-colors';`
- New: `import { toLocalIsoDate } from '@/utils';`

`components/session-list-item.tsx`:
- Old: `import { trainingTypeStyles } from '@/lib/training-colors';`
- New: `import { trainingTypeStyles } from '@/utils';`

`components/training-heatmap.tsx`:
- Old: `import { toLocalIsoDate, trainingTypeStyles, trainingTypes } from '@/lib/training-colors';`
- New: `import { toLocalIsoDate, trainingTypeStyles, trainingTypes } from '@/utils';`

`components/plan-list-item.tsx`:
- Old: `import { trainingTypeStyles } from '@/lib/training-colors';`
- New: `import { trainingTypeStyles } from '@/utils';`

`components/template-library.tsx`:
- Old: `import { trainingTypeStyles } from '@/lib/training-colors';`
- New: `import { trainingTypeStyles } from '@/utils';`

`components/workout-template-detail.tsx`:
- Old: `import { trainingTypeStyles } from '@/lib/training-colors';`
- New: `import { trainingTypeStyles } from '@/utils';`

`components/session-detail.tsx`:
- Old: `import { trainingTypeStyles } from '@/lib/training-colors';`
- New: `import { trainingTypeStyles } from '@/utils';`

`components/nav.tsx`:
- Old: `import { isNavLinkActive, navLinkHref, primaryNavLinks } from '@/lib/nav-links';`
- New: `import { isNavLinkActive, navLinkHref, primaryNavLinks } from '@/utils';`

`components/bottom-nav.tsx`:
- Old: `import { isNavLinkActive, navLinkHref, primaryNavLinks } from '@/lib/nav-links';`
- New: `import { isNavLinkActive, navLinkHref, primaryNavLinks } from '@/utils';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/utils apps/web/src/lib apps/web/src/app apps/web/src/components
git commit -m "refactor(web): extract utils/ from lib/ (theme, training-colors, nav-links)"
```

---

## Task 3: `shared/api/`

**Files:**
- Create (via `git mv`): `apps/web/src/shared/api/api-client.ts`, `apps/web/src/shared/api/api-server.ts`, `apps/web/src/shared/api/build-cookie-header.ts`, `apps/web/src/shared/api/build-cookie-header.test.ts`
- Create: `apps/web/src/shared/api/index.ts`
- Modify (import path only): `app/exercises/page.tsx`, `app/login/page.tsx`, `app/page.tsx`, `app/plans/page.tsx`, `app/plans/[id]/page.tsx`, `app/plans/templates/page.tsx`, `app/plans/templates/[id]/page.tsx`, `app/progress/page.tsx`, `app/tracker/page.tsx`, `app/tracker/[id]/page.tsx`, `app/users/page.tsx`, `components/nav.tsx`, `components/create-user-form.tsx`, `components/fork-template-button.tsx`, `components/plan-detail.tsx`, `components/plan-list-item.tsx`, `components/exercise-picker.tsx`, `components/create-plan-form.tsx`, `components/add-training-form.tsx`, `components/start-plan-button.tsx`, `components/session-detail.tsx`, `components/workout-template-detail.tsx`

**Interfaces:**
- Produces: `@/shared/api` barrel exporting `apiClient`, `getServerApiClient`, `buildCookieHeader`.

- [ ] **Step 1: Move the three source files and the test**

```bash
cd apps/web/src
mkdir -p shared/api
git mv lib/api-client.ts shared/api/api-client.ts
git mv lib/api-server.ts shared/api/api-server.ts
git mv lib/build-cookie-header.ts shared/api/build-cookie-header.ts
git mv lib/build-cookie-header.test.ts shared/api/build-cookie-header.test.ts
```

`api-server.ts` imports `buildCookieHeader` via `import { buildCookieHeader } from './build-cookie-header';` — both files moved to the same new folder together, so this relative import needs no edit. Same for the test file's `import { buildCookieHeader } from './build-cookie-header';`.

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/shared/api/index.ts`:

```ts
export { apiClient } from './api-client';
export { getServerApiClient } from './api-server';
export { buildCookieHeader } from './build-cookie-header';
```

- [ ] **Step 3: Update every consumer's import line**

`app/exercises/page.tsx`:
- Old: `import { apiClient } from '@/lib/api-client';`
- New: `import { apiClient } from '@/shared/api';`

`app/login/page.tsx`:
- Old: `import { apiClient } from '@/lib/api-client';`
- New: `import { apiClient } from '@/shared/api';`

`app/page.tsx`, `app/plans/page.tsx`, `app/plans/[id]/page.tsx`, `app/plans/templates/page.tsx`, `app/plans/templates/[id]/page.tsx`, `app/progress/page.tsx`, `app/tracker/page.tsx`, `app/tracker/[id]/page.tsx`, `app/users/page.tsx` — each has:
- Old: `import { getServerApiClient } from '@/lib/api-server';`
- New: `import { getServerApiClient } from '@/shared/api';`

`components/nav.tsx`:
- Old: `import { apiClient } from '@/lib/api-client';`
- New: `import { apiClient } from '@/shared/api';`

`components/create-user-form.tsx`, `components/fork-template-button.tsx`, `components/plan-detail.tsx`, `components/plan-list-item.tsx`, `components/exercise-picker.tsx`, `components/create-plan-form.tsx`, `components/add-training-form.tsx`, `components/start-plan-button.tsx`, `components/session-detail.tsx`, `components/workout-template-detail.tsx` — each has:
- Old: `import { apiClient } from '@/lib/api-client';`
- New: `import { apiClient } from '@/shared/api';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: this will fail on `apps/web/src/lib/use-session.ts` — it imports `apiClient` via a **relative** path (`from './api-client'`), not the `@/lib/...` alias, so it's outside the alias grep the consumer list above was built from and isn't in the list. Once `api-client.ts` moves out of `lib/`, this relative import breaks. Fix it as part of this step:

- Old (`apps/web/src/lib/use-session.ts`): `import { apiClient } from './api-client';`
- New: `import { apiClient } from '@/shared/api';`

Then re-run typecheck. Expected: PASS.

(This file is not itself relocated in this task — only its import line changes. It moves to `shared/hooks/` in Task 5, which will find this import line already correct and can skip re-editing it.)

- [ ] **Step 5: Run the moved test**

Run: `pnpm --filter @acme/web test -- build-cookie-header`
Expected: PASS (test content unchanged, only location moved).

- [ ] **Step 6: Commit**

```bash
git add -A -- apps/web/src/shared/api apps/web/src/lib apps/web/src/app apps/web/src/components
git commit -m "refactor(web): extract shared/api/ from lib/ (api-client, api-server, build-cookie-header)"
```

---

## Task 4: `shared/i18n/`

**Files:**
- Create (via `git mv`, whole folder): `apps/web/src/shared/i18n/` (from `apps/web/src/lib/i18n/`)
- Modify (import path only): every file across `app/` and `components/` that imports `@/lib/i18n/*`

**Interfaces:**
- Produces: `@/shared/i18n/context`, `@/shared/i18n/server`, `@/shared/i18n/locales`, `@/shared/i18n/dictionary` — same submodule names as today, no barrel (per Global Constraints).

- [ ] **Step 1: Move the whole folder**

```bash
cd apps/web/src
mkdir -p shared
git mv lib/i18n shared/i18n
```

Everything inside `i18n/` imports from siblings with relative paths (`./dictionary`, `./locales`, `./dictionaries/en`) — moving the folder as a unit means none of those need edits.

- [ ] **Step 2: Update every consumer's import line**

Find every remaining reference and update the prefix only (submodule name and imported symbols stay identical):

```bash
cd apps/web/src
grep -rl "@/lib/i18n/" app components | while read -r f; do
  sed -i '' "s#@/lib/i18n/#@/shared/i18n/#g" "$f"
done
```

This touches: `app/error.tsx`, `app/exercises/page.tsx`, `app/layout.tsx`, `app/login/page.tsx`, `app/not-found.tsx`, `app/page.tsx`, `app/plans/[id]/page.tsx`, `app/plans/page.tsx`, `app/plans/templates/[id]/page.tsx`, `app/plans/templates/page.tsx`, `app/progress/page.tsx`, `app/settings/page.tsx`, `app/tracker/[id]/page.tsx`, `app/tracker/page.tsx`, `app/users/page.tsx`, and every file in `components/` that has `useLocale` (all but `volume-chart.tsx`).

- [ ] **Step 3: Verify no `@/lib/i18n` references remain**

Run: `grep -rn "@/lib/i18n" apps/web/src`
Expected: no output.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/shared/i18n apps/web/src/lib apps/web/src/app apps/web/src/components
git commit -m "refactor(web): move lib/i18n to shared/i18n"
```

---

## Task 5: `shared/hooks/`

**Files:**
- Create (via `git mv`): `apps/web/src/shared/hooks/use-session.ts`, `apps/web/src/shared/hooks/use-active-session-store.ts` (renamed from `active-session-store.ts`), `apps/web/src/shared/hooks/use-active-session-store.test.ts` (renamed from `active-session-store.test.ts`)
- Create: `apps/web/src/shared/hooks/index.ts`
- Modify (import path only): `app/login/page.tsx`, `components/nav.tsx`, `components/bottom-nav.tsx`, `components/active-session-banner.tsx`, `components/session-detail.tsx`

**Interfaces:**
- Produces: `@/shared/hooks` barrel exporting `sessionQueryKey`, `useSession`, `useActiveSessionStore`, `isSessionExpired`, `useActiveSession`.

- [ ] **Step 1: Move and rename**

```bash
cd apps/web/src
mkdir -p shared/hooks
git mv lib/use-session.ts shared/hooks/use-session.ts
git mv lib/active-session-store.ts shared/hooks/use-active-session-store.ts
git mv lib/active-session-store.test.ts shared/hooks/use-active-session-store.test.ts
```

`use-session.ts` imported `apiClient` via a relative path (`from './api-client'`). Task 3 already fixed this to `import { apiClient } from '@/shared/api';` (api-client.ts moved out of `lib/` in that task, which broke this relative import immediately, so Task 3 fixed it on the spot rather than leaving it broken until now). Verify the line already reads `import { apiClient } from '@/shared/api';` — no edit needed here.

The test file imports `import { isSessionExpired, useActiveSessionStore } from './active-session-store';` — update to match the rename:

- Old: `import { isSessionExpired, useActiveSessionStore } from './active-session-store';`
- New: `import { isSessionExpired, useActiveSessionStore } from './use-active-session-store';`

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/shared/hooks/index.ts`:

```ts
export { sessionQueryKey, useSession } from './use-session';
export { isSessionExpired, useActiveSession, useActiveSessionStore } from './use-active-session-store';
```

- [ ] **Step 3: Update every consumer's import line**

`app/login/page.tsx`:
- Old: `import { sessionQueryKey } from '@/lib/use-session';`
- New: `import { sessionQueryKey } from '@/shared/hooks';`

`components/nav.tsx`:
- Old: `import { useActiveSession, useActiveSessionStore } from '@/lib/active-session-store';` and `import { sessionQueryKey, useSession } from '@/lib/use-session';`
- New: single combined line `import { sessionQueryKey, useActiveSession, useActiveSessionStore, useSession } from '@/shared/hooks';`

`components/bottom-nav.tsx`:
- Old: `import { useActiveSession } from '@/lib/active-session-store';`
- New: `import { useActiveSession } from '@/shared/hooks';`

`components/active-session-banner.tsx`:
- Old: `import { useActiveSession } from '@/lib/active-session-store';`
- New: `import { useActiveSession } from '@/shared/hooks';`

`components/session-detail.tsx`:
- Old: `import { useActiveSession, useActiveSessionStore } from '@/lib/active-session-store';`
- New: `import { useActiveSession, useActiveSessionStore } from '@/shared/hooks';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Run the moved test**

Run: `pnpm --filter @acme/web test -- use-active-session-store`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A -- apps/web/src/shared/hooks apps/web/src/lib apps/web/src/app apps/web/src/components
git commit -m "refactor(web): extract shared/hooks/ from lib/ (use-session, active-session-store)"
```

---

## Task 6: `shared/components/`

**Files:**
- Create (via `git mv`): `apps/web/src/shared/components/nav.tsx`, `bottom-nav.tsx`, `confirm-button.tsx`, `exercise-picker.tsx`, `session-list-item.tsx`, `training-heatmap.tsx`
- Create: `apps/web/src/shared/components/index.ts`
- Modify (import path only): `app/layout.tsx`, `app/page.tsx`, `app/progress/page.tsx`, `app/tracker/page.tsx`, `components/plan-list-item.tsx`, `components/session-detail.tsx`, `components/plan-detail.tsx`

**Interfaces:**
- Produces: `@/shared/components` barrel exporting `Nav`, `BottomNav`, `ConfirmButton`, `ExercisePicker`, `SessionListItem`, `TrainingHeatmap`.

- [ ] **Step 1: Move the six files**

```bash
cd apps/web/src
mkdir -p shared/components
git mv components/nav.tsx shared/components/nav.tsx
git mv components/bottom-nav.tsx shared/components/bottom-nav.tsx
git mv components/confirm-button.tsx shared/components/confirm-button.tsx
git mv components/exercise-picker.tsx shared/components/exercise-picker.tsx
git mv components/session-list-item.tsx shared/components/session-list-item.tsx
git mv components/training-heatmap.tsx shared/components/training-heatmap.tsx
```

`exercise-picker.tsx` has uncommitted local changes — re-read it after the move to confirm its current content before touching its import lines in the next step (per Global Constraints).

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/shared/components/index.ts`:

```ts
export { BottomNav } from './bottom-nav';
export { ConfirmButton } from './confirm-button';
export { ExercisePicker } from './exercise-picker';
export { Nav } from './nav';
export { SessionListItem } from './session-list-item';
export { TrainingHeatmap } from './training-heatmap';
```

- [ ] **Step 3: Update every consumer's import line**

`app/layout.tsx`:
- Old: `import { BottomNav } from '@/components/bottom-nav';` and `import { Nav } from '@/components/nav';`
- New: single combined line `import { BottomNav, Nav } from '@/shared/components';`

`app/page.tsx`:
- Old: `import { SessionListItem } from '@/components/session-list-item';`
- New: `import { SessionListItem } from '@/shared/components';`
- (`StreakBanner` import on the line below stays untouched here — it moves in Task 13.)

`app/progress/page.tsx`:
- Old: `import { TrainingHeatmap } from '@/components/training-heatmap';`
- New: `import { TrainingHeatmap } from '@/shared/components';`
- (`Mascot` and `VolumeChart` stay untouched here — they move in Task 9.)

`app/tracker/page.tsx`:
- Old: `import { SessionListItem } from '@/components/session-list-item';` and `import { TrainingHeatmap } from '@/components/training-heatmap';`
- New: single combined line `import { SessionListItem, TrainingHeatmap } from '@/shared/components';`
- (`ActiveSessionBanner`, `AddTrainingForm`, `StartPlanButton` stay untouched here — they move in Task 13.)

`components/plan-list-item.tsx`:
- Old: `import { ConfirmButton } from '@/components/confirm-button';`
- New: `import { ConfirmButton } from '@/shared/components';`

`components/session-detail.tsx`:
- Old: `import { ConfirmButton } from '@/components/confirm-button';` and `import { ExercisePicker } from '@/components/exercise-picker';`
- New: single combined line `import { ConfirmButton, ExercisePicker } from '@/shared/components';`

`components/plan-detail.tsx`:
- Old: `import { ConfirmButton } from '@/components/confirm-button';` and `import { ExercisePicker } from '@/components/exercise-picker';`
- New: single combined line `import { ConfirmButton, ExercisePicker } from '@/shared/components';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/shared/components apps/web/src/components apps/web/src/app
git commit -m "refactor(web): extract shared/components/ (nav, bottom-nav, confirm-button, exercise-picker, session-list-item, training-heatmap)"
```

---

## Task 7: `features/users/`

**Files:**
- Create (via `git mv`): `apps/web/src/features/users/components/create-user-form.tsx`
- Create: `apps/web/src/features/users/index.ts`
- Modify (import path only): `app/users/page.tsx`

- [ ] **Step 1: Move**

```bash
cd apps/web/src
mkdir -p features/users/components
git mv components/create-user-form.tsx features/users/components/create-user-form.tsx
```

Update its own import line:
- Old: `import { apiClient } from '@/lib/api-client';` — already updated to `'@/shared/api'` in Task 3; if for any reason it still reads the old path, fix it now to `import { apiClient } from '@/shared/api';`. Its `useLocale` import should already read `@/shared/i18n/context` from Task 4.

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/features/users/index.ts`:

```ts
export { CreateUserForm } from './components/create-user-form';
```

- [ ] **Step 3: Update the consumer**

`app/users/page.tsx`:
- Old: `import { CreateUserForm } from '@/components/create-user-form';`
- New: `import { CreateUserForm } from '@/features/users';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/features/users apps/web/src/components apps/web/src/app/users
git commit -m "refactor(web): extract features/users/"
```

---

## Task 8: `features/exercises/`

**Files:**
- Create (via `git mv`): `apps/web/src/features/exercises/components/equipment-icon.tsx`, `apps/web/src/features/exercises/lib/exercise-library.ts`
- Create: `apps/web/src/features/exercises/index.ts`
- Modify (import path only): `app/exercises/page.tsx`, `features/exercises/components/equipment-icon.tsx`

- [ ] **Step 1: Move**

```bash
cd apps/web/src
mkdir -p features/exercises/components features/exercises/lib
git mv components/equipment-icon.tsx features/exercises/components/equipment-icon.tsx
git mv lib/exercise-library.ts features/exercises/lib/exercise-library.ts
```

`app/exercises/page.tsx` has uncommitted local changes — re-read its current content before editing (per Global Constraints).

Fix `equipment-icon.tsx`'s own import — it moved from `components/` (sibling to `lib/`) to `features/exercises/components/` (now two levels above `features/exercises/lib/`):
- Old: `import type { Equipment } from '@/lib/exercise-library';`
- New: `import type { Equipment } from '../lib/exercise-library';`

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/features/exercises/index.ts`:

```ts
export { EquipmentIcon } from './components/equipment-icon';
```

`exercise-library.ts`'s exports (`MuscleGroup`, `Equipment`, `LibraryExercise`, `exerciseLibrary`) have no consumer outside this feature — don't re-export them from the barrel.

- [ ] **Step 3: Update the consumer**

`app/exercises/page.tsx`:
- Old: `import { EquipmentIcon } from '@/components/equipment-icon';`
- New: `import { EquipmentIcon } from '@/features/exercises';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/features/exercises apps/web/src/components apps/web/src/lib apps/web/src/app/exercises
git commit -m "refactor(web): extract features/exercises/"
```

---

## Task 9: `features/progress/`

**Files:**
- Create (via `git mv`): `apps/web/src/features/progress/components/volume-chart.tsx`, `apps/web/src/features/progress/components/mascot.tsx`
- Create: `apps/web/src/features/progress/index.ts`
- Modify (import path only): `app/progress/page.tsx`

- [ ] **Step 1: Move**

```bash
cd apps/web/src
mkdir -p features/progress/components
git mv components/volume-chart.tsx features/progress/components/volume-chart.tsx
git mv components/mascot.tsx features/progress/components/mascot.tsx
```

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/features/progress/index.ts`:

```ts
export { Mascot } from './components/mascot';
export { VolumeChart } from './components/volume-chart';
```

- [ ] **Step 3: Update the consumer**

`app/progress/page.tsx`:
- Old: `import { Mascot } from '@/components/mascot';` and `import { VolumeChart } from '@/components/volume-chart';`
- New: single combined line `import { Mascot, VolumeChart } from '@/features/progress';`
- (`TrainingHeatmap` import stays as `@/shared/components` from Task 6.)

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/features/progress apps/web/src/components apps/web/src/app/progress
git commit -m "refactor(web): extract features/progress/"
```

---

## Task 10: `features/settings/`

**Files:**
- Create (via `git mv`): `apps/web/src/features/settings/components/language-switcher.tsx`, `apps/web/src/features/settings/components/theme-switcher.tsx`
- Create: `apps/web/src/features/settings/index.ts`
- Modify (import path only): `app/settings/page.tsx`

- [ ] **Step 1: Move**

```bash
cd apps/web/src
mkdir -p features/settings/components
git mv components/language-switcher.tsx features/settings/components/language-switcher.tsx
git mv components/theme-switcher.tsx features/settings/components/theme-switcher.tsx
```

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/features/settings/index.ts`:

```ts
export { LanguageSwitcher } from './components/language-switcher';
export { ThemeSwitcher } from './components/theme-switcher';
```

- [ ] **Step 3: Update the consumer**

`app/settings/page.tsx`:
- Old: `import { LanguageSwitcher } from '@/components/language-switcher';` and `import { ThemeSwitcher } from '@/components/theme-switcher';`
- New: single combined line `import { LanguageSwitcher, ThemeSwitcher } from '@/features/settings';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/features/settings apps/web/src/components apps/web/src/app/settings
git commit -m "refactor(web): extract features/settings/"
```

---

## Task 11: `features/plans/` (flat components + templates)

**Files:**
- Create (via `git mv`): `apps/web/src/features/plans/components/plan-list-item.tsx`, `apps/web/src/features/plans/components/create-plan-form.tsx`, `apps/web/src/features/plans/components/templates/template-library.tsx`, `apps/web/src/features/plans/components/templates/workout-template-detail.tsx`, `apps/web/src/features/plans/components/templates/fork-template-button.tsx`
- Create: `apps/web/src/features/plans/index.ts`
- Modify (import path only): `app/plans/page.tsx`, `app/plans/templates/page.tsx`, `app/plans/templates/[id]/page.tsx`, `features/plans/components/templates/template-library.tsx`

- [ ] **Step 1: Move**

```bash
cd apps/web/src
mkdir -p features/plans/components/templates
git mv components/plan-list-item.tsx features/plans/components/plan-list-item.tsx
git mv components/create-plan-form.tsx features/plans/components/create-plan-form.tsx
git mv components/template-library.tsx features/plans/components/templates/template-library.tsx
git mv components/workout-template-detail.tsx features/plans/components/templates/workout-template-detail.tsx
git mv components/fork-template-button.tsx features/plans/components/templates/fork-template-button.tsx
```

Fix `template-library.tsx`'s import of its sibling (now same folder, was `@/components/fork-template-button`):
- Old: `import { ForkTemplateButton } from '@/components/fork-template-button';`
- New: `import { ForkTemplateButton } from './fork-template-button';`

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/features/plans/index.ts`:

```ts
export { CreatePlanForm } from './components/create-plan-form';
export { PlanListItem } from './components/plan-list-item';
export { TemplateLibrary } from './components/templates/template-library';
export { WorkoutTemplateDetail } from './components/templates/workout-template-detail';
```

`PlanDetail` is added to this same barrel in Task 12 — don't add a line for it yet.

- [ ] **Step 3: Update consumers**

`app/plans/page.tsx`:
- Old: `import { CreatePlanForm } from '@/components/create-plan-form';` and `import { PlanListItem } from '@/components/plan-list-item';`
- New: single combined line `import { CreatePlanForm, PlanListItem } from '@/features/plans';`

`app/plans/templates/page.tsx`:
- Old: `import { TemplateLibrary } from '@/components/template-library';`
- New: `import { TemplateLibrary } from '@/features/plans';`

`app/plans/templates/[id]/page.tsx`:
- Old: `import { WorkoutTemplateDetail } from '@/components/workout-template-detail';`
- New: `import { WorkoutTemplateDetail } from '@/features/plans';`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src/features/plans apps/web/src/components apps/web/src/app/plans
git commit -m "refactor(web): extract features/plans/ (list item, create form, templates)"
```

---

## Task 12: `features/plans/components/plan-detail/` (split)

Split the 359-line `components/plan-detail.tsx` along its existing component boundaries: `PlanDetail` (main), `AddPlanExerciseCard`, `ExerciseRow`, `ExerciseEditRow`. Each becomes its own file in a `plan-detail/` folder. Content for each is copied verbatim from the current `components/plan-detail.tsx` (read it fresh — it's still sitting there until this task's last step deletes it) at the line ranges given below; only the import block at the top of each new file changes.

**Files:**
- Create: `apps/web/src/features/plans/components/plan-detail/index.tsx`, `add-plan-exercise-card.tsx`, `exercise-row.tsx`, `exercise-edit-row.tsx`
- Delete (via `git rm`): `apps/web/src/components/plan-detail.tsx`
- Modify: `apps/web/src/features/plans/index.ts`
- Modify (import path only): `apps/web/src/app/plans/[id]/page.tsx`

**Interfaces:**
- Consumes: `ConfirmButton`, `ExercisePicker` from `@/shared/components`; `apiClient` from `@/shared/api`; `useLocale` from `@/shared/i18n/context`.
- Produces: `PlanDetail` component, re-exported from `@/features/plans`.

- [ ] **Step 1: Create `add-plan-exercise-card.tsx`**

Copy the body of `AddPlanExerciseCard` verbatim from `apps/web/src/components/plan-detail.tsx` (currently lines 152–245, the full function including its closing brace) into a new file `apps/web/src/features/plans/components/plan-detail/add-plan-exercise-card.tsx`, with this import block at the top:

```tsx
import type { Exercise } from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ExercisePicker } from '@/shared/components';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
```

Change `function AddPlanExerciseCard(...)` to `export function AddPlanExerciseCard(...)`.

- [ ] **Step 2: Create `exercise-row.tsx`**

Copy the body of `ExerciseRow` verbatim (currently lines 247–294) into `apps/web/src/features/plans/components/plan-detail/exercise-row.tsx`:

```tsx
import type { WorkoutExercise } from '@acme/contracts';
import { Button, Stack } from '@acme/ui';
import { TableCell, TableRow } from '@acme/ui/web';
import { useMutation } from '@tanstack/react-query';
import { ConfirmButton } from '@/shared/components';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
```

Change `function ExerciseRow(...)` to `export function ExerciseRow(...)`.

- [ ] **Step 3: Create `exercise-edit-row.tsx`**

Copy the body of `ExerciseEditRow` verbatim (currently lines 296–359) into `apps/web/src/features/plans/components/plan-detail/exercise-edit-row.tsx`:

```tsx
import type { UpdateWorkoutExerciseInput, WorkoutExercise } from '@acme/contracts';
import { Button, Input, Text } from '@acme/ui';
import { TableCell, TableRow } from '@acme/ui/web';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
```

Change `function ExerciseEditRow(...)` to `export function ExerciseEditRow(...)`.

- [ ] **Step 4: Create `index.tsx`**

Copy the body of `PlanDetail` verbatim (currently lines 25–150) into `apps/web/src/features/plans/components/plan-detail/index.tsx`, with `'use client';` as the first line, then this import block, then the `PlanFormValues` type alias, then the `PlanDetail` function:

```tsx
'use client';

import type { WorkoutPlanWithExercises } from '@acme/contracts';
import { updateWorkoutPlanInputSchema } from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ConfirmButton } from '@/shared/components';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { AddPlanExerciseCard } from './add-plan-exercise-card';
import { ExerciseEditRow } from './exercise-edit-row';
import { ExerciseRow } from './exercise-row';

type PlanFormValues = z.infer<typeof updateWorkoutPlanInputSchema>;
```

`PlanDetail` itself keeps `export function PlanDetail(...)` exactly as it reads today — no signature change.

- [ ] **Step 5: Delete the original file**

```bash
cd apps/web/src
git rm components/plan-detail.tsx
```

- [ ] **Step 6: Add `PlanDetail` to the feature barrel**

In `apps/web/src/features/plans/index.ts`, add:

```ts
export { PlanDetail } from './components/plan-detail';
```

(Barrel now has 5 export lines total: `CreatePlanForm`, `PlanDetail`, `PlanListItem`, `TemplateLibrary`, `WorkoutTemplateDetail`.)

- [ ] **Step 7: Update the consumer**

`app/plans/[id]/page.tsx`:
- Old: `import { PlanDetail } from '@/components/plan-detail';`
- New: `import { PlanDetail } from '@/features/plans';`

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 9: Lint (this task hand-writes new files, unlike the pure moves in earlier tasks)**

Run: `pnpm --filter @acme/web lint`
Expected: PASS. Fix any import-order or formatting issues Biome reports.

- [ ] **Step 10: Commit**

```bash
git add -A -- apps/web/src/features/plans apps/web/src/components/plan-detail.tsx apps/web/src/app/plans
git commit -m "refactor(web): split plan-detail.tsx into features/plans/components/plan-detail/"
```

---

## Task 13: `features/tracker/` (flat components + lib)

**Files:**
- Create (via `git mv`): `apps/web/src/features/tracker/components/active-session-banner.tsx`, `add-training-form.tsx`, `start-plan-button.tsx`, `streak-banner.tsx`; `apps/web/src/features/tracker/lib/muscle-fatigue.ts`, `muscle-fatigue.test.ts`, `plan-progress.ts`, `plan-progress.test.ts`
- Create: `apps/web/src/features/tracker/index.ts`
- Modify (import path only): `app/page.tsx`, `app/tracker/page.tsx`

- [ ] **Step 1: Move**

```bash
cd apps/web/src
mkdir -p features/tracker/components features/tracker/lib
git mv components/active-session-banner.tsx features/tracker/components/active-session-banner.tsx
git mv components/add-training-form.tsx features/tracker/components/add-training-form.tsx
git mv components/start-plan-button.tsx features/tracker/components/start-plan-button.tsx
git mv components/streak-banner.tsx features/tracker/components/streak-banner.tsx
git mv lib/muscle-fatigue.ts features/tracker/lib/muscle-fatigue.ts
git mv lib/muscle-fatigue.test.ts features/tracker/lib/muscle-fatigue.test.ts
git mv lib/plan-progress.ts features/tracker/lib/plan-progress.ts
git mv lib/plan-progress.test.ts features/tracker/lib/plan-progress.test.ts
```

The `.test.ts` files import their subject with a relative path (`./muscle-fatigue`, `./plan-progress`) — moved alongside their subject, no edit needed.

`components/session-detail.tsx` (untouched until Task 14) imports both by absolute path — `import { alreadyTrainedGroups } from '@/lib/muscle-fatigue';` and `import { prefillFrom, unloggedPlanExercises } from '@/lib/plan-progress';`. Once the `git mv`s above run, `lib/` no longer contains these files and those two imports break. Fix them now, in place, without touching anything else in `session-detail.tsx`:

- Old: `import { alreadyTrainedGroups } from '@/lib/muscle-fatigue';`
- New: `import { alreadyTrainedGroups } from '@/features/tracker/lib/muscle-fatigue';`
- Old: `import { prefillFrom, unloggedPlanExercises } from '@/lib/plan-progress';`
- New: `import { prefillFrom, unloggedPlanExercises } from '@/features/tracker/lib/plan-progress';`

This is a temporary reach-through import into the feature's own internal `lib/` (not via the barrel, since these two have no outside consumer and stay unexported) — it's replaced entirely in Task 14, which deletes `session-detail.tsx` and recreates its logic from scratch across several new files with correct relative imports. Task 14's instructions do not depend on this file's current import lines, so no further coordination is needed.

- [ ] **Step 2: Create the barrel**

Create `apps/web/src/features/tracker/index.ts`:

```ts
export { ActiveSessionBanner } from './components/active-session-banner';
export { AddTrainingForm } from './components/add-training-form';
export { StartPlanButton } from './components/start-plan-button';
export { StreakBanner } from './components/streak-banner';
```

`SessionDetail` is added to this same barrel in Task 14. `muscle-fatigue.ts` and `plan-progress.ts` have no consumer outside this feature (only `session-detail`, added next task) — don't re-export them.

- [ ] **Step 3: Update consumers**

`app/page.tsx`:
- Old: `import { StreakBanner } from '@/components/streak-banner';`
- New: `import { StreakBanner } from '@/features/tracker';`
- (`SessionListItem` import stays as `@/shared/components` from Task 6.)

`app/tracker/page.tsx`:
- Old: `import { ActiveSessionBanner } from '@/components/active-session-banner';`, `import { AddTrainingForm } from '@/components/add-training-form';`, `import { StartPlanButton } from '@/components/start-plan-button';`
- New: single combined line `import { ActiveSessionBanner, AddTrainingForm, StartPlanButton } from '@/features/tracker';`
- (`SessionListItem`, `TrainingHeatmap` imports stay as `@/shared/components` from Task 6.)

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 5: Run the moved tests**

Run: `pnpm --filter @acme/web test -- muscle-fatigue plan-progress`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A -- apps/web/src/features/tracker apps/web/src/components apps/web/src/lib apps/web/src/app
git commit -m "refactor(web): extract features/tracker/ (banners, forms, muscle-fatigue, plan-progress)"
```

---

## Task 14: `features/tracker/components/session-detail/` (split)

Split the 960-line `components/session-detail.tsx` along its existing component/hook boundaries: two local timer hooks + `formatDuration`, three small input primitives, `AddSetForm`, `ExerciseLogCard`, `AddSessionExerciseCard`, and the main `SessionDetail`. Content for each new file is copied verbatim from the current `components/session-detail.tsx` (read it fresh — it's still there until this task's last step deletes it) at the line ranges given below; only the import block at the top of each new file changes.

**Files:**
- Create: `apps/web/src/features/tracker/components/session-detail/index.tsx`, `use-timers.ts`, `number-inputs.tsx`, `add-set-form.tsx`, `exercise-log-card.tsx`, `add-session-exercise-card.tsx`
- Delete (via `git rm`): `apps/web/src/components/session-detail.tsx`
- Modify: `apps/web/src/features/tracker/index.ts`
- Modify (import path only): `apps/web/src/app/tracker/[id]/page.tsx`

**Interfaces:**
- Consumes: `ConfirmButton`, `ExercisePicker` from `@/shared/components`; `apiClient` from `@/shared/api`; `useLocale` from `@/shared/i18n/context`; `useActiveSession`, `useActiveSessionStore` from `@/shared/hooks`; `trainingTypeStyles` from `@/utils`; `alreadyTrainedGroups` from `../../lib/muscle-fatigue`; `prefillFrom`, `unloggedPlanExercises` from `../../lib/plan-progress`.
- Produces: `SessionDetail` component, re-exported from `@/features/tracker`.

- [ ] **Step 1: Create `use-timers.ts`**

Copy verbatim from `apps/web/src/components/session-detail.tsx`, currently lines 26–77: the `useElapsedTime` function, the `formatDuration` function, and the `useCountdown` function (including its dependency-array comment — that comment documents real, deliberate behavior, keep it word for word). Put them in `apps/web/src/features/tracker/components/session-detail/use-timers.ts` with this import at the top:

```ts
import { useEffect, useState } from 'react';
```

Change all three declarations from `function X` to `export function X`.

- [ ] **Step 2: Create `number-inputs.tsx`**

Copy verbatim: `EditableNumber` (currently lines 436–483, including its leading doc comment — keep it, it documents non-obvious null-commit behavior), `CompactNumberInput` (currently lines 716–739), `BigNumberInput` (currently lines 801–826). Put them in `apps/web/src/features/tracker/components/session-detail/number-inputs.tsx` with this import block:

```tsx
import { Text } from '@acme/ui';
import { useState } from 'react';
```

Change all three from `function X` to `export function X`.

- [ ] **Step 3: Create `add-set-form.tsx`**

Copy verbatim: `AddSetForm` (currently lines 741–799). Put it in `apps/web/src/features/tracker/components/session-detail/add-set-form.tsx` with:

```tsx
import type { AddTrainingSessionExerciseInput } from '@acme/contracts';
import { Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { CompactNumberInput } from './number-inputs';
```

Change `function AddSetForm` to `export function AddSetForm`.

- [ ] **Step 4: Create `exercise-log-card.tsx`**

Copy verbatim: `ExerciseLogCard` (currently lines 485–714, including its inline comments — they document real invariants, keep them). Put it in `apps/web/src/features/tracker/components/session-detail/exercise-log-card.tsx` with:

```tsx
import type { TrainingSessionWithExercises } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { Timer, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/shared/components';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { AddSetForm } from './add-set-form';
import { EditableNumber } from './number-inputs';
import { formatDuration } from './use-timers';
```

Change `function ExerciseLogCard` to `export function ExerciseLogCard`.

- [ ] **Step 5: Create `add-session-exercise-card.tsx`**

Copy verbatim: `AddSessionExerciseCard` (currently lines 828–960). Put it in `apps/web/src/features/tracker/components/session-detail/add-session-exercise-card.tsx` with:

```tsx
import type { AddTrainingSessionExerciseInput, Exercise, TrainingSessionWithExercises } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExercisePicker } from '@/shared/components';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { alreadyTrainedGroups } from '../../lib/muscle-fatigue';
import { BigNumberInput } from './number-inputs';
```

Change `function AddSessionExerciseCard` to `export function AddSessionExerciseCard`.

- [ ] **Step 6: Create `index.tsx`**

Copy verbatim: the `REST_SECONDS` constant (currently line 24) and the `SessionDetail` function (currently lines 79–433, including its inline comments). Put them in `apps/web/src/features/tracker/components/session-detail/index.tsx` with `'use client';` as the first line, then:

```tsx
import type { Exercise, TrainingSessionWithExercises, WorkoutPlanWithExercises } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmButton } from '@/shared/components';
import { useActiveSession, useActiveSessionStore } from '@/shared/hooks';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { prefillFrom, unloggedPlanExercises } from '../../lib/plan-progress';
import { trainingTypeStyles } from '@/utils';
import { AddSessionExerciseCard } from './add-session-exercise-card';
import { ExerciseLogCard } from './exercise-log-card';
import { formatDuration, useElapsedTime } from './use-timers';
```

`SessionDetail` itself keeps `export function SessionDetail(...)` exactly as it reads today — no signature change. Note it no longer needs `useEffect` (that stayed in `use-timers.ts`), so don't import it here.

- [ ] **Step 7: Delete the original file**

```bash
cd apps/web/src
git rm components/session-detail.tsx
```

- [ ] **Step 8: Add `SessionDetail` to the feature barrel**

In `apps/web/src/features/tracker/index.ts`, add:

```ts
export { SessionDetail } from './components/session-detail';
```

- [ ] **Step 9: Update the consumer**

`app/tracker/[id]/page.tsx`:
- Old: `import { SessionDetail } from '@/components/session-detail';`
- New: `import { SessionDetail } from '@/features/tracker';`

- [ ] **Step 10: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: PASS.

- [ ] **Step 11: Lint**

Run: `pnpm --filter @acme/web lint`
Expected: PASS. Fix any import-order or formatting issues Biome reports.

- [ ] **Step 12: Commit**

```bash
git add -A -- apps/web/src/features/tracker apps/web/src/components/session-detail.tsx apps/web/src/app/tracker
git commit -m "refactor(web): split session-detail.tsx into features/tracker/components/session-detail/"
```

---

## Task 15: Cleanup and full verification

**Files:**
- Delete: `apps/web/src/components/` (now empty), `apps/web/src/lib/` (now empty)

- [ ] **Step 1: Confirm both directories are empty**

Run: `find apps/web/src/components apps/web/src/lib -type f`
Expected: no output. If anything prints, stop — a file was missed in an earlier task; go back and move it into the correct `features/`, `shared/`, or `utils/` location before continuing.

- [ ] **Step 2: Remove the empty directories**

```bash
cd apps/web/src
rmdir components lib
```

- [ ] **Step 3: Confirm no stale import paths remain anywhere**

Run: `grep -rn "@/components/\|@/lib/" apps/web/src`
Expected: no output.

- [ ] **Step 4: Full verification suite**

Run in order, each must pass before running the next:

```bash
pnpm --filter @acme/web typecheck
pnpm --filter @acme/web lint
pnpm --filter @acme/web test
pnpm --filter @acme/web build
```

- [ ] **Step 5: Commit**

```bash
git add -A -- apps/web/src
git commit -m "chore(web): remove now-empty components/ and lib/ directories"
```
