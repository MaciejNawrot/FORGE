# Plan detail analytics — design

## Problem

`/plans/[id]` only lets you edit a plan's name/notes/exercise list. There's no way to see how training against that specific plan has actually gone — volume trend, how many times it's been run, personal bests on its exercises, recent sessions. The Stitch mock "Workout Analytics Dashboard" (Desktop + Mobile, in the "Elite Gym Companion" project) shows this shape: stat cards, a volume chart, and a session/exercise history. The site already has this exact pattern built once, globally, at `/progress` (volume chart, stat cards, personal bests, heatmap) — this reuses that pattern, scoped to one plan's sessions.

## Decisions

- Keep the existing plan editor (hero + name/notes form + exercise table) as-is. Add a new analytics section below it — don't replace the editor.
- Scope analytics to sessions logged from this plan (`trainingSessions.planId`), not the account's full history.
- Replace the mock's "Avg RPE" stat with **Avg Duration** — RPE isn't tracked anywhere in the schema (sets only store reps + weightKg); adding it is out of scope. `durationSeconds` is already recorded per session.
- "Personal bests" reuses `/progress`'s existing approximation (top weight logged per exercise within the sessions in scope) — not true all-time-PR detection. Consistent with what's already shipped; a real PR feature is separate scope.
- No pagination for the history list — personal-scale data, matches `/tracker`'s existing "recent N, no pager" pattern. Add pagination later if a plan ever has enough sessions to need it.
- No separate mobile route/component. `/progress` already achieves the mock's desktop/mobile split with Tailwind `md:` breakpoints on one component; do the same here.

## Backend changes

- `listTrainingSessionsQuerySchema` (packages/contracts/src/schemas/training.schema.ts) gains an optional `planId: z.string().uuid()`.
- `TrainingRepository.listSessions` gains an optional `planId` param, adding `eq(trainingSessions.planId, planId)` to the query's conditions when present. Column already exists (used by `createSession`); this just adds a read-side filter.
- `TrainingService.listSessions` and the controller's `listSessions` handler thread the new param through.
- No migration needed.

## Frontend changes

### `apps/web/src/app/plans/[id]/page.tsx`

- After fetching `plan`, fetch `apiClient.training.listSessions({ query: { planId: id } })`, then hydrate each via `apiClient.training.getSession` (same N+1-per-session pattern already used by `/progress` and `/tracker`).
- Pass the hydrated sessions to a new `<PlanAnalytics sessions={...} />`, rendered after `<PlanDetail plan={...} />`.

### `apps/web/src/features/plans/lib/plan-analytics.ts` (new, pure functions + test)

- `computePlanStats(sessions: TrainingSessionWithExercises[])` → `{ totalVolumeKg, sessionCount, avgDurationSeconds, bestByExercise: Map<exerciseName, {weight, reps, date}>, volumeBySession: {date, volume}[] }`.
- Mirrors the per-session volume/best-weight accumulation `/progress` already does inline, but bucketed per-session instead of per-week (a single plan has few enough sessions that per-session bars are more legible than weekly buckets). Not extracted into a shared module with `/progress` — the bucketing differs enough (weekly vs per-session, with/without prior-window delta) that a shared abstraction would need parameters for both, which isn't simpler than two small pure functions.
- One `plan-analytics.test.ts` (mirrors the existing `plan-progress.test.ts` in `features/tracker/lib`): given a couple of fake sessions, assert totalVolumeKg, sessionCount, and bestByExercise are correct.

### `apps/web/src/features/plans/components/plan-detail/plan-analytics.tsx` (new)

Rendered below the exercise table, only when `sessions.length > 0` (otherwise a single muted "log a session from this plan to see analytics" line — matches `noBests`/`noExercises` empty-state convention elsewhere in this feature).

- **Stat cards** (`grid-cols-2 md:grid-cols-4`, `Card className="glass-panel"`, same visual language as `/progress`'s stat cards): Total Volume, Sessions, Avg Duration, Personal Bests (count).
- **Volume chart**: reuse `VolumeChart` from `features/progress` as-is — one bar per session, labeled by date.
- **Personal bests**: same card layout as `/progress`'s "Personal Bests" card (Award icon, name + reps/date + weight), top 3 by weight.
- **Recent sessions**: card grid identical in style to `/tracker`'s recent-sessions cards (`Badge` for type, date, `Link` to `/tracker/[id]`), most recent first, capped at the same 8 shown as `/tracker`.

### i18n

- New `planAnalytics` namespace in `en.ts` / `pl.ts`: `heading`, `noSessions`, `totalVolume`, `sessions`, `avgDuration`, `personalBests` (reuse copy style from `progress`), `recentSessions`.

## Testing

- `plan-analytics.test.ts`: pure-function test for `computePlanStats` (volume sum, session count, avg duration, best-by-exercise), same shape as the existing `plan-progress.test.ts`.
- Manual check in dev: open a plan with logged sessions, confirm stat cards/chart/bests/recent-sessions all populate and match `/progress`'s numbers when cross-checked against the same underlying sessions.

## Out of scope

- RPE tracking (schema + input UI) — no data source for it today.
- True all-time PR detection (vs. best-within-scope approximation).
- Pagination / full history table with filters (the mock's desktop table).
- Any change to `apps/mobile` (unrelated native app, not in active development).
- Refactoring `/progress`'s existing inline computation to share code with the new `plan-analytics.ts` — deferred until a third caller makes the duplication actually costly.
