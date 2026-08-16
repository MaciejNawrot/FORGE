# Tracker: prefilled set checklist replaces "Suggested Next" — design

## Problem

Starting a plan-driven session on `/tracker/[id]` today shows a "Suggested Next" card (plan exercises not yet logged, tap one to prefill the add-form) and a separate "Logged Exercises" section that only appears once at least one set exists. That's two mental steps to log a set that's already fully specified by the plan (weight, reps, target set count) — tap the suggestion, then tap "Log Set", repeated per set. The user wants a notepad-first flow: on opening the session, every plan exercise is already there with its target sets shown, prefilled with the right numbers; logging a set is one tap on a checkbox to confirm "I did that one."

## Decision

Drop "Suggested Next" entirely. The exercise list becomes the single source of truth from the moment the session opens, built from the plan whether or not anything is logged yet. Each plan exercise's card shows its already-logged sets (as today, editable) plus placeholder rows for any remaining target sets — reps/weight editable, unchecked. Checking a placeholder's checkbox logs it immediately via the same `addSessionExercise` call the app already uses, using whatever reps/weight are currently shown in the row. There's no separate "confirm" step and no uncheck — once logged, a row becomes a real set (same edit/delete affordances as today).

## Data (`apps/web/src/features/tracker/lib/plan-progress.ts`)

New pure function, unit-testable independent of any component:

```ts
type ExerciseRow = {
  planExercise: WorkoutPlanExercise | null; // null for ad-hoc, non-plan exercises
  loggedExercise: TrainingSessionExercise | null; // null if nothing logged yet this session
  exercise: Exercise;
  placeholderCount: number; // 0 for ad-hoc or fully-logged exercises
  placeholderPrefill: { reps: number; weightKg: string };
};

function buildExerciseRows(
  plan: WorkoutPlanWithExercises | null | undefined,
  sessionExercises: TrainingSessionWithExercises['exercises'],
  lastPerformance: LastPerformanceEntry[] | undefined,
): ExerciseRow[];
```

Rules:
- One row per plan exercise (in plan order), followed by any `sessionExercises` entries whose `exercise.id` isn't in the plan (ad-hoc adds, in their existing order).
- `placeholderCount = max(0, (planExercise?.sets ?? 0) - (loggedExercise?.sets.length ?? 0))`. Ad-hoc rows (`planExercise === null`) always get `0`.
- Placeholder prefill: if the exercise already has logged sets this session, reuse its last logged set's `reps`/`weightKg` (same seeding `AddSetForm` already does). Otherwise fall back to `prefillFrom(planExercise, lastPerformance.find(...))` — the existing function, unchanged.

`unloggedPlanExercises` is deleted (superseded — `buildExerciseRows` covers logged and unlogged plan exercises in one structure). `prefillFrom` stays as-is, called from inside `buildExerciseRows`.

## Frontend (`session-detail/`)

- **`index.tsx`**:
  - Delete the "Suggested Next" `Card` block and the `notYetLogged`/`selected`/`reps`/`weightKg` state that only existed to feed it and the picker's prefill. `AddSessionExerciseCard` keeps its own internal state for exercise picking (it already owns `reps`/`weightKg` display, just stop threading prefill in from the deleted section — a fresh pick starts blank like it does today for an untracked exercise).
  - Keep the `suggestedLastPerformance` query (rename to `lastPerformance`, still keyed on `planExerciseIds`) — it now feeds `buildExerciseRows` instead of the deleted section.
  - Section header: build `rows = buildExerciseRows(plan, session.exercises, lastPerformance)`. Render unconditionally when `rows.length > 0`; empty state (`dict.sessionDetail.noSets`) only when `rows.length === 0`.
  - `AddSessionExerciseCard` (picker for exercises outside the plan) moves below the exercise list, right where the list used to end — unchanged props/behavior otherwise.

- **`exercise-log-card.tsx`**: accepts two new optional props, `placeholderCount: number` and `placeholderPrefill: { reps: number; weightKg: string }`. After the existing `exercise.sets.map(...)` rows, render `placeholderCount` `PlannedSetRow`s continuing the index numbering. `AddSetForm` (for logging sets beyond the target) stays exactly where it is, below the placeholders — unaffected, still seeded from `lastSet`.

- **New `planned-set-row.tsx`**: one row, index badge, `CompactNumberInput`-style editable reps/weight (local state, initialized from `placeholderPrefill`, no auto-save on blur — only the checkbox commits), and a checkbox. On check: same `addSessionExercise` mutation `AddSetForm` uses (`{ exerciseId, reps, weightKg }`), disabled while pending; `onSuccess` calls the existing `onSetLogged` (starts the rest timer, same as any other logged set) and `onChanged` (triggers `router.refresh()`, which re-fetches the session and the row naturally becomes a real logged-set row next render — no local "logged" flag needed).

- Cards for exercises with `planExercise === null` (ad-hoc) render exactly as they do today — zero placeholders, `AddSetForm` only.

## i18n

- Remove `activeTracking.suggestedNext` (en + pl).
- `activeTracking.loggedExercises` value changes from "Logged Exercises"/"Zalogowane ćwiczenia" to "Exercises"/"Ćwiczenia" — key name unchanged, only the two dictionary strings.

## Error handling

Unchanged pattern: `PlannedSetRow`'s mutation error surfaces the same way `AddSetForm`'s does today (inline `Text tone="destructive"` under the row on failure), checkbox re-enables so the user can retry.

## Testing

- `plan-progress.test.ts`: extend with `buildExerciseRows` cases — plan exercise with zero logged sets (placeholders = plan target, prefill from historical last-performance-or-plan), plan exercise partially logged (placeholders = remainder, prefill from this session's last logged set, not historical), plan exercise fully logged (zero placeholders), ad-hoc exercise not in plan (zero placeholders, passes through), no plan at all (`plan` null/undefined → rows come only from `sessionExercises`, all zero placeholders).
- Manual: open a fresh session for a plan with a 4-set exercise, confirm 4 unchecked rows appear prefilled from last performance with no taps needed; check one, confirm it becomes a real editable row and the rest timer starts; edit a placeholder's weight before checking it and confirm the logged set reflects the edit, not the original prefill; fully check an exercise and confirm the "+ add set" form still allows a 5th set; add an ad-hoc exercise via the picker and confirm it has no placeholder rows.

## Out of scope

- No backend/schema changes — this is entirely a client-side reshaping of already-available data (plan targets + last performance are both already fetched).
- No "uncheck" — undoing a logged set stays the existing delete (×) button on the resulting real set row.
- No change to how extra sets beyond the plan target are added (`AddSetForm` unchanged).
- No change to `AddSessionExerciseCard`'s own picker/prefill behavior for genuinely new (non-plan) exercises.
