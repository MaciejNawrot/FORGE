# apps/web feature-based restructure

## Problem

`apps/web/src` has a single flat `components/` (24 files) and `lib/` (19
files) that mix every domain together. No boundary between "tracker-only"
code, "plans-only" code, and code genuinely shared across the app. Adding to
the wrong file or reusing the wrong helper is easy because nothing signals
ownership.

## Goal

Reorganize into `features/`, `shared/`, `utils/`, driven by actual import
usage (grepped, not guessed). No behavior change. `app/` keeps 100% of its
routing role; only import paths change and two oversized components move
into folders.

## Placement rule

- Used by exactly one feature route → lives in that feature.
- Used by 2+ features, or by the app shell (`layout.tsx`, root `page.tsx`) →
  `shared/`.
- Pure function, no React, no state → `utils/`.
- A feature's `index.ts` barrel is its public surface. A hook that only its
  own split-out component uses stays unexported, colocated in that
  component's folder.

Usage was confirmed by grepping every cross-file import (see commit history
of this doc's branch for the raw grep output); the mapping below is not a
guess.

## Target tree

```
src/
  app/                       # unchanged — routing only, imports updated
  features/
    users/
      components/create-user-form.tsx
      index.ts
    exercises/
      components/equipment-icon.tsx
      lib/exercise-library.ts
      index.ts
    plans/
      components/
        plan-list-item.tsx
        create-plan-form.tsx
        plan-detail/
          index.tsx                    # PlanDetail (main)
          add-plan-exercise-card.tsx
          exercise-row.tsx
          exercise-edit-row.tsx
        templates/
          template-library.tsx
          workout-template-detail.tsx
          fork-template-button.tsx
      index.ts
    tracker/
      components/
        active-session-banner.tsx
        add-training-form.tsx
        start-plan-button.tsx
        streak-banner.tsx           # sole consumer is root page.tsx; tracker-domain
        session-detail/
          index.tsx                    # SessionDetail (main)
          exercise-log-card.tsx
          add-set-form.tsx
          add-session-exercise-card.tsx
          number-inputs.tsx            # EditableNumber, CompactNumberInput, BigNumberInput
          use-timers.ts                # useElapsedTime, useCountdown, formatDuration
      lib/
        muscle-fatigue.ts (+.test.ts)
        plan-progress.ts (+.test.ts)   # sole consumer is session-detail
      index.ts
    progress/
      components/volume-chart.tsx, mascot.tsx
      index.ts
    settings/
      components/language-switcher.tsx, theme-switcher.tsx
      index.ts
  shared/
    components/
      nav.tsx, bottom-nav.tsx          # app shell
      confirm-button.tsx               # used by plans + tracker
      exercise-picker.tsx              # used by plans + tracker
      session-list-item.tsx            # used by root page.tsx + tracker
      training-heatmap.tsx             # used by progress + tracker
    hooks/
      use-session.ts                   # used by login + shared nav
      use-active-session-store.ts (+.test.ts)  # used by shared nav/bottom-nav + tracker
    api/
      api-client.ts, api-server.ts, build-cookie-header.ts (+.test.ts)
    i18n/                              # existing lib/i18n, moved as-is
  utils/
    theme.ts, training-colors.ts, nav-links.ts
    index.ts
```

No `features/auth`: the login page has no extractable component today, it
only consumes `shared/hooks/use-session`. An empty feature folder would be
speculative.

## Big-file split (deviates from a literal "logic vs. template" split)

`session-detail.tsx` (960 lines) and `plan-detail.tsx` (359 lines) are not
one component with tangled state and JSX — each is several already-distinct
sibling components stacked in a single file. Forcing all their state and
mutations into one shared "logic" hook would prop-drill 10+ mutations back
down through the tree, making the code worse. Instead each becomes a folder,
split along the component boundaries the file already has:

- `session-detail/`: main `SessionDetail` in `index.tsx`; `ExerciseLogCard`,
  `AddSetForm`, `AddSessionExerciseCard` each get their own file; the three
  tiny input primitives (`EditableNumber`, `CompactNumberInput`,
  `BigNumberInput`) share one `number-inputs.tsx`; the two local timer hooks
  plus `formatDuration` move to `use-timers.ts`.
- `plan-detail/`: main `PlanDetail` in `index.tsx`; `AddPlanExerciseCard`,
  `ExerciseRow`, `ExerciseEditRow` each get their own file.

Every other component/lib file moves as-is via `git mv` (history preserved).

## Explicitly out of scope

- Extracting components out of `page.tsx` files that are large but never
  lived in `components/` (root `page.tsx` 254 lines, `progress/page.tsx` 265,
  `login/page.tsx` 165). Not part of "reorganize the components folder";
  raise separately if wanted.
- Any behavior change. This is a pure move + import rewrite + the two folder
  splits above.

## tsconfig

Add explicit path aliases in `apps/web/tsconfig.json` so feature boundaries
are visible in import statements, not just on disk:

```json
"paths": {
  "@/*": ["./src/*"],
  "@/features/*": ["./src/features/*"],
  "@/shared/*": ["./src/shared/*"],
  "@/utils/*": ["./src/utils/*"]
}
```

## Verification

- `pnpm --filter @acme/web typecheck`
- `pnpm --filter @acme/web lint`
- `pnpm --filter @acme/web test`
- `pnpm --filter @acme/web build`

All four must pass with zero behavior change. No new tests needed — this is
a move, existing tests (`active-session-store.test.ts`,
`build-cookie-header.test.ts`, `muscle-fatigue.test.ts`,
`plan-progress.test.ts`) move with their subject and must still pass
unmodified.
