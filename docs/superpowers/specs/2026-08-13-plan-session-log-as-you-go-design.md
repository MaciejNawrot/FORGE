# Log-as-you-go plan sessions — design

## Problem

`StartPlanButton` (`apps/web/src/components/start-plan-button.tsx`) writes every one of a plan's exercises into the new session immediately, before the user has done a single rep — pre-filled from `training.lastPerformance` or the plan's stored target. This causes two real problems, found during the final review of the workout-history-tracking feature:

- **The same-session fatigue badge is effectively always on.** `session.exercises` (which includes every pre-written row) is what `alreadyTrainedGroups` checks against, so the moment a plan starts, all of its muscle groups already read as "trained today."
- **`lastPerformance` gets polluted by sessions that were never actually performed.** If a session is abandoned after being started, its pre-written rows still count as "the last time you did this exercise" for every future plan start or ad hoc log — the numbers reflect what the plan predicted, not what the user did.

## Decision

Stop pre-writing exercises at session creation. `StartPlanButton` becomes a thin "create an empty session linked to this plan" action. The session-detail page shows a **"suggested next"** list of the plan's not-yet-logged exercises, pre-filled with last-actual-performance (or the plan's target, as before) — but nothing is written to `trainingSessionExercises` until the user explicitly taps "Log Set," exactly like the existing ad hoc flow. This makes the fatigue badge and `lastPerformance` both accurate by construction: only real, confirmed logs ever exist as rows.

No backend or contract changes are needed — this reuses `workouts.getPlan` and `training.lastPerformance`, both already built for the current (pre-write) flow.

## Data flow

1. User taps "Start" on a plan (`apps/web/src/app/tracker/page.tsx`). `StartPlanButton` calls `training.createSession` with `{ date, type: category ?? 'strength', planId }` and redirects to `/tracker/[id]`. No exercise writes, no `lastPerformance` call, no `workouts.getPlan` call — `category` is passed in as a prop from the plan list the button already renders inside (`WorkoutPlanListItem.category`), so no extra fetch is needed at all.
2. The session-detail server page (`apps/web/src/app/tracker/[id]/page.tsx`) fetches the session as today; when `session.planId` is non-null, it additionally fetches that plan via `workouts.getPlan` and passes it to `SessionDetail` as an optional prop. A failed or missing plan fetch (e.g. the plan was deleted after the session started) results in a `null` plan — the suggestions section simply doesn't render; the session works exactly as an ad hoc session would.
3. `SessionDetail` computes `notYetLogged` — the plan's exercises whose catalog id doesn't appear in `session.exercises` yet — via a small pure helper (see below). When `notYetLogged` is non-empty, it batch-fetches `training.lastPerformance` for those catalog ids (one call, comma-joined ids, same pattern `AddSessionExerciseCard` already uses) and renders a "Suggested next" list above the log-exercise card: each entry shows the exercise name and its pre-fill source (last actual performance, or the plan's stored target if never logged).
4. Tapping a suggestion sets the (now-lifted) `selected` / `sets` / `reps` / `weightKg` state that `AddSessionExerciseCard` renders from — the same state the ad hoc search-and-pick flow already sets, just pre-filled instead of defaulted to 3/10/blank. The user can adjust the numbers before logging.
5. Tapping "Log Set" calls the existing `training.addSessionExercise` mutation — unchanged. On success, `router.refresh()` re-fetches the session (and the plan, if present) from the server; the logged exercise now appears in `session.exercises`, drops out of `notYetLogged`, and only now contributes to `alreadyTrainedGroups` and to future `lastPerformance` lookups.
6. The ad hoc catalog search (`ExercisePicker`) is untouched — picking an exercise that also happens to be on the linked plan works exactly like picking any other exercise; it just also happens to disappear from the suggestions list once logged, same as a suggestion tap would.

## Components

- **`start-plan-button.tsx`** — rewritten to take `category: TrainingTypeValue | null` as a prop (sourced from the plan row the button already lives inside) alongside `planId`. Single `createSession` call, no other network requests.
- **`apps/web/src/app/tracker/page.tsx`** — passes `category={plan.category}` to `StartPlanButton` (the data is already in scope from `listPlans`).
- **`apps/web/src/app/tracker/[id]/page.tsx`** — conditionally fetches `workouts.getPlan` when `session.planId` is set; passes the result (or `null`) to `SessionDetail` as a new `plan` prop.
- **`apps/web/src/lib/plan-progress.ts`** (new) — one pure function, `unloggedPlanExercises(planExercises, loggedExercises)`, filtering a plan's exercises down to those not yet present in a session's logged exercises (matched by catalog exercise id). Mirrors the existing `muscle-fatigue.ts` pattern: small, pure, independently tested.
- **`session-detail.tsx`**:
  - `SessionDetail` gains an optional `plan: WorkoutPlanWithExercises | null` prop, computes `notYetLogged` via `unloggedPlanExercises`, and (when non-empty) fetches batched `lastPerformance` for those exercises' catalog ids.
  - A new small section renders `notYetLogged` as tappable suggestion rows, each showing the exercise name and its pre-fill source line (reusing `dict.activeTracking.lastTime` when history exists, otherwise showing the plan's stored sets/reps/weight).
  - `AddSessionExerciseCard`'s `selected` / `sets` / `reps` / `weightKg` state moves up into `SessionDetail` and is passed down as props, so both the suggestions list and the ad hoc picker drive the same controlled state. `AddSessionExerciseCard`'s own per-selection `lastPerformance` caption query and `alreadyTrainedGroups` check are unchanged — they already work off whatever exercise is currently `selected`, regardless of how it got selected.

## Error handling

- Missing/failed plan fetch → `plan` is `null` → no suggestions section, session behaves as ad hoc-only. No special-casing needed since `planId` was already nullable and optional throughout.
- Missing/failed `lastPerformance` fetch for suggestions → falls back to the plan's stored target per exercise, same fallback the old `StartPlanButton` used.
- A suggestion for an exercise later removed from the catalog is not a realistic case (the catalog is seeded/read-only) and is out of scope.

## Testing

- `plan-progress.ts`: unit test for `unloggedPlanExercises` — plan exercises with no matching logged entry are kept, ones already logged (by catalog id) are filtered out, empty logged list returns the full plan exercise list unchanged.
- No other new pure logic; `alreadyTrainedGroups` and `getLastPerformance` are unchanged and already covered.
- Manual verification: start a plan, confirm the session begins empty with a "Suggested next" list; log one suggested exercise, confirm it disappears from suggestions and appears in "Previous Sets"; confirm the fatigue badge does *not* fire for an ad hoc exercise sharing a muscle group with a plan exercise that hasn't been logged yet, but *does* fire once it has been.

## Out of scope

- No schema/contract changes (no `performed` flag, no new endpoint).
- No change to how templates are forked or how plans are created/edited.
- No change to the ad hoc exercise flow beyond the state-lifting refactor needed to share it with suggestions.
