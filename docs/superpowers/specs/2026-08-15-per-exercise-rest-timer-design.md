# Per-exercise rest timer — design

## Problem

The rest countdown shown after logging a set (`session-detail.tsx`) is a single fixed `REST_SECONDS = 90` constant for every exercise, in every session, for every user. A gym-goer's real rest need varies a lot by exercise (60s between bicep curls, 3+ minutes between heavy squats) and by how a specific set actually went. Today there's no way to:

- default the rest countdown to what actually works for a given exercise,
- add time to a countdown that's already running out (short of manually retyping the number),
- restart a countdown you let run past zero or skipped by mistake.

## Decision

Persist the rest duration on the same row that already logs a set (`training_session_exercises`), the same place `weightKg`/`reps`/`sets` live. No new table: the existing "last performance" lookup (`lastPerformanceByExerciseIds`, already queried per exercise when you pick it, used for the "last time" prefill) gets one more field, `restSeconds`, so "what rest did I last use for this exercise" comes for free from a query that's already firing.

A rest period's *target* duration (what a fresh countdown starts from, and what gets saved as the new per-exercise default) is tracked separately from its *remaining* (ticking) seconds, so a mid-rest "+15s" tap extends the live countdown without resetting progress already made — today's `useCountdown` hook conflates the two via a `[active, seconds]` effect dependency that would wipe `remaining` back to full on any `seconds` change.

## Components

- **`packages/db/src/schema/training.ts`** — `trainingSessionExercises` gains `restSeconds: integer('rest_seconds')`, nullable (unset until a rest period involving that logged exercise ends).

- **`packages/contracts/src/schemas/training.schema.ts`**:
  - `trainingSessionExerciseSchema` gains `restSeconds: z.number().int().min(0).nullable()`.
  - `lastPerformanceEntrySchema` gains `restSeconds: z.number().int().min(0).nullable()`.
  - New `updateSessionExerciseRestInputSchema`: `{ restSeconds: z.number().int().min(0) }`.

- **`packages/contracts/src/contracts/training.contract.ts`** — new `updateSessionExerciseRest`: `PATCH /training-sessions/:sessionId/exercises/:exerciseId/rest`, body `updateSessionExerciseRestInputSchema`, responses `{ 200: trainingSessionExerciseSchema, 401, 404 }`. Same shape as the existing `finishSession` endpoint.

- **`apps/api/.../training.repository.ts`**:
  - `updateExerciseRest(id, sessionId, restSeconds)` — `UPDATE training_session_exercises SET rest_seconds = ... WHERE id = ... AND session_id = ...`, mirroring `removeExercise`'s scoping.
  - `lastPerformanceByExerciseIds` — select and return `restSeconds` alongside the existing fields; same "first row per exercise id, rows already ordered most-recent-first" logic, no query restructuring.

- **`apps/api/.../training.service.ts`** / **`training.controller.ts`** — `updateExerciseRest(sessionId, exerciseId, userId, restSeconds)`: verify the session belongs to `userId` (same ownership check pattern as `removeExercise`), then delegate to the repository. Controller wires the new contract entry the same way `finishSession` is wired.

- **`apps/web/src/components/session-detail.tsx`**:
  - `useCountdown`'s reset effect changes its dependency array from `[active, seconds]` to `[active]` (with a `biome-ignore` comment, matching the existing `autoFocus` ignore in this file) — so it seeds `remaining` from `seconds` only when a rest period *starts* (`active` flips false→true), not on every change to the target duration mid-rest.
  - New `restSeconds` state in `SessionDetail`, holding the *target* for the in-progress (or about-to-start) rest period.
  - `AddSessionExerciseCard`'s `onAdded` callback is extended to pass back the created exercise-log id and the picked exercise's id (from the already-fetched `lastPerformance` query for that exercise, extended with the new field). `SessionDetail` uses this to seed `restSeconds` to `lastPerformance.restSeconds ?? 90` (fallback: today's constant) and remembers which log row id the in-progress rest belongs to.
  - Rest pill UI gains two controls next to the existing skip (X):
    - **+15s** button: `setRestSeconds(restSeconds + 15)`; also `rest.setRemaining(rest.remaining + 15)` directly (not via the effect); fires the `PATCH .../rest` mutation with the new total against the tracked log row id.
    - **Reset** button (circular-arrow icon): `rest.setRemaining(restSeconds)` — restarts the countdown from the period's current target. No mutation (nothing about the saved default changed).
  - Existing tap-to-edit (click the number → input, `onBlur` commits) now also updates `restSeconds` and fires the same `PATCH .../rest` mutation, in addition to its current `rest.setRemaining` behavior.
  - Skip (X): unchanged aside from no longer needing to persist anything extra — by the time skip is pressed, any deliberate adjustment (+15s or manual edit) has already been persisted.

- **`apps/web/src/lib/i18n/dictionaries/{en,pl}.ts`** — no new label strings needed beyond an `aria-label`/`sr-only` for the new Reset icon button (matching the existing `aria-label="Skip rest"` pattern — plain string, not a dictionary entry, consistent with that button).

## Data flow

Log a set for exercise E → `addSessionExercise` returns the new log row → `SessionDetail` reads E's `lastPerformance.restSeconds` (already being fetched for the "last time" line) → seeds `restSeconds` state and starts the countdown from it → user taps +15s zero or more times (each tap extends the live countdown immediately and fires a fire-and-forget `PATCH .../rest` with the running total) or edits the number directly (same persistence) or taps Reset (local only, restarts to the current target) → user taps skip → rest pill closes; the log row's `restSeconds` already reflects the final adjusted value from the last persisted tap/edit, or stays at whatever `lastPerformance` seeded it with if never touched (no redundant PATCH needed in that case — nothing changed).

Next time exercise E is logged (this session or a future one), `lastPerformanceByExerciseIds` returns that persisted `restSeconds` as the new seed.

## Error handling / edge cases

- **First time logging an exercise** (no prior `lastPerformance` row, or a prior row with `restSeconds` still null from before this feature): falls back to the existing `REST_SECONDS = 90` constant. No migration/backfill of historical rows — old logs simply read as "no preference yet."
- **PATCH failures** (network blip on a +15s tap): fire-and-forget, no retry/toast — the live countdown already updated locally regardless, so the user's immediate experience is unaffected; only the persisted default for *next* time silently doesn't update. Acceptable given the low stakes (worst case: next rest starts from a slightly stale default, itself adjustable the same way).
- **Two logged exercises in quick succession before an old rest ends**: rest periods aren't queued or merged — starting a new rest (via `onAdded`) simply reseeds `restSeconds`/`remaining` for the newly logged exercise, same as today's single fixed-duration behavior. Out of scope to change.

## Testing

- Backend: one `training.service.spec.ts` test for `updateExerciseRest`, mirroring the existing `finishSession` test (mock repository, assert the service passes arguments through and returns the repository's result).
- Manual verification: log a set, confirm rest starts at 90s (first time); tap +15s twice, confirm it reads 120s and doesn't jump back to 90 mid-count; tap Reset, confirm it jumps back to 120 (the adjusted target, not the original 90); log the same exercise again later in the session, confirm the new rest starts at 120s; edit the number directly to 45, confirm both the live countdown and the next default reflect 45.

## Out of scope

- No manual "rest settings" screen — the default is entirely learned from usage (last value used), not separately configured.
- No retry/queueing for failed rest-persistence PATCH calls.
- No backfill of `restSeconds` for exercises logged before this change.
- No change to the +15s increment size or a second +30s button (considered, +15s alone was chosen).
