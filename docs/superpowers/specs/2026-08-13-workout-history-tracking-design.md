# Workout history tracking — design

## Problem

User trains a fixed 3-day rotation (day 1: bench/OHP/curls/split squats + ad hoc; day 2: squat + full body; day 3: deadlift + full body), reusing the same plan week over week, and sometimes adds ad hoc exercises mid-session. Today:

- Plan exercises are free-text names, matched to the exercise catalog only by exact lowercase string when a session is started from a plan — silent skip on any mismatch.
- Sessions have no link back to the plan they came from.
- Nothing surfaces "what did I lift last time" for an exercise, whether pre-filled from a plan or added ad hoc.
- Nothing warns that a muscle group was already trained earlier in the same session before logging an ad hoc exercise.

## Decisions

- Plan exercises reference the exercise catalog (`exerciseId`) instead of free text.
- Sessions store a nullable `planId` back-reference to the plan they were started from.
- Starting a plan pre-fills each exercise with the user's last actual logged performance (sets/reps/weight), falling back to the plan's stored target if never logged.
- Fatigue signal is session-scoped only for v1: warn if a muscle group was already hit earlier in *today's* session. No cross-day lookback.
- Last-performance and fatigue are computed on demand (no cache table) — personal-scale data, on-demand queries are simpler and sufficient.

## Schema changes

- `workoutExercises`: replace `name` (text) with `exerciseId` (uuid, FK → `exercises.id`). Migration backfills by matching existing plan exercise names to the catalog (case-insensitive); rows with no match are left for manual re-pick in the plan editor.
- `trainingSessions`: add `planId` (uuid, nullable, FK → `workoutPlans.id`, `onDelete: set null`).

## Backend

- New endpoint `GET /training/last-performance?exerciseIds=a,b,c` — for the current user, returns per exercise the most recent `{ sets, reps, weightKg, date }`, found via the latest `trainingSessionExercises` row joined to `trainingSessions` filtered by `userId`, ordered by session date/createdAt descending.
- No new endpoint for fatigue: session responses already include each logged exercise's `muscleGroups` via the joined `exercise` row, so "already hit today" is derived client-side from `session.exercises`.
- `training.createSession` accepts an optional `planId`, passed through when a session is started from a plan.
- `StartPlanButton` flow: calls the last-performance endpoint for the plan's exercises and pre-fills sets/reps/weight from history, falling back to the plan's stored target when no history exists.

## UI

- Plan create/edit forms: replace the free-text exercise name input with the same catalog search-picker used in `AddSessionExerciseCard`.
- `AddSessionExerciseCard` (ad hoc add mid-session): after picking an exercise, show a caption with last-time performance (e.g. "last time: 40kg × 8 × 3 (Aug 6)") when history exists, and a small badge if any of the exercise's muscle groups already appear among exercises already logged earlier in the current session.

## Testing

- Repository test: last-performance query returns the most recent row, scoped to the requesting user, across multiple sessions.
- Pure-function test: fatigue derivation — given a list of session exercises (with muscle groups) and a candidate exercise, returns which muscle groups are already hit.

## Out of scope (v1)

- Cross-day fatigue / recovery modeling.
- Editing/reordering plan exercises' catalog links in bulk.
- Any denormalized/cached "last performance" storage.
