# Per-set training log — design

## Problem

Logging a set on `/tracker/[id]` today records one `training_session_exercises` row per "Zapisz serię" tap, with a single `sets` count bundled onto one `reps`/`weightKg` pair — e.g. "3 sets" all sharing the same 10 reps and 40kg. Real training doesn't work that way: a set of bench press might go 50kg×5, then 50kg×4, then 60kg×5 as the lifter adjusts. Today there is no way to record that variance, no way to edit a set after logging it (only delete the whole bundled entry and re-add), and the "Poprzednie serie" card is a near-duplicate of the add-form rather than a useful editable log. The app is meant to replace a paper notepad for tracking a workout; right now it's less flexible than paper.

## Decision

Split "an exercise entry" from "a set." `training_session_exercises` becomes a group (one per exercise per session, matching the existing invariant `unloggedPlanExercises` already assumes) carrying exercise-level metadata: which exercise, a free-text note ("need to adjust form"), and the existing per-exercise rest-time default. A new `training_session_sets` table holds the actual physical sets — each with its own `reps` and `weightKg`, individually editable and deletable. The frontend collapses the current two-card split (an add-form card plus a near-duplicate summary card) into one card per logged exercise, showing every set as an inline-editable row with its own "add another set" control — the log itself *is* the editable notepad, not a static recap of it.

## Data model

- **`packages/db/src/schema/training.ts`**:
  - `trainingSessionExercises` drops `sets`, `reps`, `weightKg`. Gains `notes: text('notes')` (nullable).
  - New `trainingSessionSets` table: `id` (uuid pk), `sessionExerciseId` (uuid, FK → `trainingSessionExercises.id`, `onDelete: 'cascade'`), `reps` (integer, not null), `weightKg` (numeric(6,2), nullable — bodyweight sets), `position` (integer, not null — insertion order within the group), `createdAt`/`updatedAt`.
  - New relation: `trainingSessionExercises` has-many `trainingSessionSets`; reverse belongs-to.

- **Migration** (hand-written SQL, not `drizzle-kit generate` — this is a data transform, not a pure schema diff):
  1. `CREATE TABLE training_session_sets (...)` with the FK and index on `session_exercise_id`.
  2. `INSERT INTO training_session_sets (session_exercise_id, reps, weight_kg, position) SELECT id, reps, weight_kg, generate_series(0, sets - 1) FROM training_session_exercises` — each old bundled row becomes `sets` identical child rows. This is lossless for what the old data actually recorded (it never captured per-set variance, so `sets` identical rows is the only faithful expansion) and preserves every historical logged number.
  3. `ALTER TABLE training_session_exercises DROP COLUMN sets, DROP COLUMN reps, DROP COLUMN weight_kg`.
  4. `ALTER TABLE training_session_exercises ADD COLUMN notes text`.

## API

- **`packages/contracts/src/schemas/training.schema.ts`**:
  - New `trainingSessionSetSchema`: `{ id, sessionExerciseId, reps, weightKg, position, createdAt, updatedAt }`.
  - `trainingSessionExerciseSchema`: remove `sets`/`reps`/`weightKg`; add `notes: z.string().max(2000).nullable()` and `sets: z.array(trainingSessionSetSchema)`.
  - `addTrainingSessionExerciseInputSchema` becomes `{ exerciseId, reps, weightKg? }` — no `sets` count; this call always logs exactly one physical set.
  - New `updateTrainingSessionSetInputSchema`: `{ reps, weightKg? }`.
  - New `updateSessionExerciseNotesInputSchema`: `{ notes: string | null }`.
  - `lastPerformanceEntrySchema` drops `sets`; it now describes the most recently logged *individual set* for an exercise (`{ exerciseId, reps, weightKg, restSeconds, date }`).
  - New path-params schema for a set: reuse the pattern of `trainingSessionExerciseParamsSchema` — `trainingSessionSetParamsSchema`: `{ sessionId, exerciseId, setId }` (`exerciseId` here is the group's id, consistent with the existing `exerciseId`-means-log-row-id convention already used by `removeSessionExercise`/`updateSessionExerciseRest`).

- **`packages/contracts/src/contracts/training.contract.ts`**:
  - `addSessionExercise`: body becomes `addTrainingSessionExerciseInputSchema` (new shape). Semantics change server-side (see below) but the route/method/response type (`201: trainingSessionExerciseSchema`) stay the same.
  - New `updateSessionSet`: `PATCH /training-sessions/:sessionId/exercises/:exerciseId/sets/:setId`, body `updateTrainingSessionSetInputSchema`, responses `{ 200: trainingSessionExerciseSchema, 401, 404 }` — returns the whole enriched group (simplest for the frontend to just replace its local copy of that card).
  - New `removeSessionSet`: `DELETE` same path, `body: c.noBody()`, responses `{ 204: c.noBody(), 401, 404 }`.
  - New `updateSessionExerciseNotes`: `PATCH /training-sessions/:sessionId/exercises/:exerciseId/notes`, body `updateSessionExerciseNotesInputSchema`, responses `{ 200: trainingSessionExerciseSchema, 401, 404 }`.
  - `removeSessionExercise` unchanged (still deletes the whole group; `onDelete: 'cascade'` on the new FK removes its sets for free, same as it already cascades from `trainingSessions` today).

- **`apps/api/.../training.repository.ts` / `.service.ts` / `.controller.ts`**:
  - `addExercise(sessionId, userId, input)`: find-or-create the group by `(sessionId, exerciseId)` (query existing row first; insert only if absent — no unique DB constraint needed, this mirrors the existing app-level invariant, not a new one), then insert one `trainingSessionSets` row under it with the next `position`. Returns the enriched group (existing `findSessionExerciseById`-style query, extended to also load its `sets` ordered by `position`).
  - `updateSet(sessionId, exerciseLogId, setId, userId, input)`: ownership-check via `findSessionById` (existing pattern), then `UPDATE training_session_sets SET ... WHERE id = setId AND session_exercise_id = exerciseLogId`, then re-fetch and return the enriched group.
  - `removeSet(...)`: same ownership check, delete the set row; if the group now has zero sets, delete the group row too (single follow-up query, not a trigger — keeps the "no orphan empty exercise cards" rule visible in application code).
  - `updateExerciseNotes(...)`: ownership check, `UPDATE training_session_exercises SET notes = ...`, return enriched group.
  - `getSession`: the exercise-loading query (`listSessionExercises`) gains a second query (or a join) to attach each group's `sets` ordered by `position`.
  - `lastPerformanceByExerciseIds`: now queries `training_session_sets` joined through `training_session_exercises` (for `sessionId`/`userId`/`exerciseId` scoping) instead of reading `reps`/`weightKg` directly off `training_session_exercises`; "most recent" ordering switches to the set's own `createdAt` as the tiebreaker within a session (a set logged later in the same session is more recent than one logged earlier, even though both share the group's `date`).

## Frontend (`session-detail.tsx`)

- **Exercise picker** (top of page): unchanged UI for searching/selecting a *new* exercise not yet in this session. Once picked, a compact reps + weight form (no more sets-count field) logs set #1 via `addSessionExercise`.
- **Per-exercise card** (replaces both the old add-form-after-selection state and the separate "Poprzednie serie" list): one card per group already in `session.exercises`, in position order:
  - Header: exercise name, tap-to-edit **notes** (placeholder text like "Add a note…", blur-to-save via `updateSessionExerciseNotes`).
  - A persistent **rest-time badge** showing the group's `restSeconds` (or a placeholder if never set), tap-to-edit any time — not only while the floating countdown pill is active. Editing it calls the existing `updateSessionExerciseRest` mutation.
  - **Sets list**: each set is a row with tap-to-edit reps and tap-to-edit weight (reusing the existing inline-edit-on-tap pattern from the rest-timer's number), plus a small delete (×) button calling `removeSessionSet`.
  - **"+ add set" mini-form** at the card's bottom: reps/weight inputs prefilled from that card's own last set (its highest-`position` row) for fast one-tap repeats, editable before confirming; confirming calls `addSessionExercise` again for the same `exerciseId` (server appends rather than duplicating the group).
- **Rest countdown pill**: unchanged mechanics (from the previous feature), except seeding gets simpler — since a group's `restSeconds` is now stable and locally available in `session.exercises` for every set after the first, only logging the *first* set of a brand-new exercise still needs the `lastPerformance` historical lookup as a fallback default; every subsequent set of an already-open card seeds straight from the group's own `restSeconds` already in hand, no extra query.
- Delete-whole-exercise stays available (existing `removeSessionExercise`/`ConfirmButton`), now living on the card's header rather than a separate summary row.

## Ripple effects elsewhere

- **`apps/web/src/app/progress/page.tsx`**: `volumeByWeek` and `bestByExercise` currently do `exercise.sets * exercise.reps * weight` and read `exercise.reps`/`weightKg` directly off the group. They switch to iterating `exercise.sets` (the nested array) and summing/comparing per individual set — `reps * weight` per set, no more `* count` multiplier. Strictly more accurate than today's approximation (which already assumed uniform reps/weight per bundled entry).
- **`apps/web/src/lib/plan-progress.ts`**: `prefillFrom`'s return type drops `sets` (was only ever used to prefill the now-removed sets-count field). Its `PrefillSource` input type also drops `sets` accordingly — both the plan-target branch and the `lastPerformance` branch already carry `reps`/`weightKg` independent of any set count.
- **Workout plan templates** (`workout_exercises`, `plan-detail.tsx`, `workout-template-detail.tsx`, `template-library.tsx`): untouched. Those are a separate table describing *target* sets/reps/weight for a plan, not logged history — out of scope.

## Testing

- Backend: repository/service unit tests (mirroring the existing `finishSession`/`updateExerciseRest` mocked-repository pattern) for: `addExercise` creating a new group vs. appending to an existing one, `updateSet`, `removeSet` (including the "last set removed deletes the group" rule), `updateExerciseNotes`.
- A direct-Postgres probe script (same technique used to verify the rest-timer migration) to sanity-check the hand-written data migration against a seeded pre-migration row: confirm `sets`-count child rows appear with the right `reps`/`weightKg`, and the old columns are gone afterward.
- Manual verification: log three sets of one exercise with different reps/weight each, confirm three distinct editable rows appear; edit one set's reps inline and confirm it persists after reload; delete a set and confirm the remaining sets stay correct; delete the last remaining set and confirm the whole card disappears; add a note and confirm it persists; open the Progress page and sanity-check the volume/personal-best numbers didn't nonsensically change.

## Out of scope

- No drag-to-reorder sets — `position` is insertion order only, matching how `training_session_exercises.position` already works.
- No per-set notes — notes are exercise-level only, per the explicit ask.
- No new undo mechanism for set deletion beyond the existing `ConfirmButton` confirmation dialog already used for exercise/session deletion.
- No change to workout plan templates or their schema.
- No backfill correction for historical variance that was never recorded — the migration is lossless *for what was stored*, not a reconstruction of what actually happened in the gym.
