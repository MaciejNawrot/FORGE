# Tracker Prefilled Set Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tracker's "Suggested Next" card with a single exercise list that shows every plan exercise from the moment a session opens, target sets prefilled, checked off one tap at a time.

**Architecture:** A new pure function `buildExerciseRows` in the existing `plan-progress.ts` merges plan targets with whatever's already logged into one ordered row list (plan exercises first, then ad-hoc adds). `ExerciseLogCard` renders each row's real logged sets plus placeholder rows for any remaining target sets; a new `PlannedSetRow` component is the placeholder — editable reps/weight with a checkbox that logs the set via the same `addSessionExercise` endpoint `AddSetForm` already calls. `AddSessionExerciseCard`'s picker moves below the list and becomes self-contained (it no longer needs its selection state lifted to the parent, since nothing external sets it anymore).

**Tech Stack:** Next.js App Router (client components), `@tanstack/react-query`, `ts-rest` API client (`apiClient`), Vitest.

## Global Constraints

- No backend/schema changes — plan targets and last-performance are already fetched; this is a client-side reshape only.
- No "uncheck" — undoing a logged set stays the existing delete (×) button on the resulting real set row.
- `AddSetForm` (logging sets beyond the plan target) is unchanged.
- Follow existing code style: no comments except where a non-obvious constraint demands one (the codebase's existing files use this sparingly — match it, don't add more).
- i18n: every user-facing string change needs both `en.ts` and `pl.ts` updated together.

---

### Task 1: `buildExerciseRows` in plan-progress.ts

**Files:**
- Modify: `apps/web/src/features/tracker/lib/plan-progress.ts`
- Test: `apps/web/src/features/tracker/lib/plan-progress.test.ts`

**Interfaces:**
- Consumes: nothing new (still calls its own `prefillFrom`, unchanged).
- Produces: `export type ExerciseRow<P, L>` and `export type SessionExerciseRow` (the concrete instantiation the app uses) and `export function buildExerciseRows(plan, sessionExercises, lastPerformance): SessionExerciseRow[]`. `SessionExerciseRow` shape: `{ key: string; exercise: Exercise; loggedExercise: TrainingSessionExercise | null; placeholderCount: number; placeholderPrefill: { reps: number; weightKg: string } }`. Task 3 and Task 4 both import `SessionExerciseRow` from this file.
- `unloggedPlanExercises` is deleted — Task 4 stops importing it.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `apps/web/src/features/tracker/lib/plan-progress.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { buildExerciseRows, prefillFrom } from './plan-progress';

describe('buildExerciseRows', () => {
  const benchPlan = { exercise: { id: 'bench' }, sets: 3, reps: 8, weightKg: 60 };
  const plan = { exercises: [benchPlan] };

  it('fills every target set as a placeholder when nothing is logged yet, prefilled from the plan target', () => {
    const rows = buildExerciseRows(plan, [], undefined);

    expect(rows).toEqual([
      {
        key: 'bench',
        exercise: { id: 'bench' },
        loggedExercise: null,
        placeholderCount: 3,
        placeholderPrefill: { reps: 8, weightKg: '60' },
      },
    ]);
  });

  it('prefers historical last performance over the plan target when nothing is logged this session', () => {
    const lastPerformance = [{ exerciseId: 'bench', reps: 10, weightKg: 65 }];

    const rows = buildExerciseRows(plan, [], lastPerformance);

    expect(rows[0]?.placeholderPrefill).toEqual({ reps: 10, weightKg: '65' });
  });

  it('shows only the remaining placeholders, prefilled from this session\'s own last logged set', () => {
    const loggedExercise = {
      exercise: { id: 'bench' },
      sets: [
        { reps: 8, weightKg: 60 },
        { reps: 8, weightKg: 62.5 },
      ],
    };

    const rows = buildExerciseRows(
      plan,
      [loggedExercise],
      [{ exerciseId: 'bench', reps: 1, weightKg: 1 }],
    );

    expect(rows).toEqual([
      {
        key: 'bench',
        exercise: { id: 'bench' },
        loggedExercise,
        placeholderCount: 1,
        placeholderPrefill: { reps: 8, weightKg: '62.5' },
      },
    ]);
  });

  it('has zero placeholders once the target set count is met', () => {
    const loggedExercise = {
      exercise: { id: 'bench' },
      sets: [
        { reps: 8, weightKg: 60 },
        { reps: 8, weightKg: 60 },
        { reps: 7, weightKg: 60 },
      ],
    };

    const rows = buildExerciseRows(plan, [loggedExercise], undefined);

    expect(rows[0]?.placeholderCount).toBe(0);
  });

  it('passes through a logged exercise not in the plan with zero placeholders', () => {
    const adHoc = { exercise: { id: 'curls' }, sets: [{ reps: 12, weightKg: 20 }] };

    const rows = buildExerciseRows(plan, [adHoc], undefined);

    expect(rows).toEqual([
      {
        key: 'bench',
        exercise: { id: 'bench' },
        loggedExercise: null,
        placeholderCount: 3,
        placeholderPrefill: { reps: 8, weightKg: '60' },
      },
      {
        key: 'curls',
        exercise: { id: 'curls' },
        loggedExercise: adHoc,
        placeholderCount: 0,
        placeholderPrefill: { reps: 0, weightKg: '' },
      },
    ]);
  });

  it('returns rows from session exercises only, all with zero placeholders, when there is no plan', () => {
    const adHoc = { exercise: { id: 'curls' }, sets: [{ reps: 12, weightKg: 20 }] };

    const rows = buildExerciseRows(null, [adHoc], undefined);

    expect(rows).toEqual([
      {
        key: 'curls',
        exercise: { id: 'curls' },
        loggedExercise: adHoc,
        placeholderCount: 0,
        placeholderPrefill: { reps: 0, weightKg: '' },
      },
    ]);
  });
});

describe('prefillFrom', () => {
  it('uses the plan target when there is no last-performance entry', () => {
    const planExercise = { reps: 8, weightKg: 60 };

    expect(prefillFrom(planExercise)).toEqual({ reps: 8, weightKg: '60' });
  });

  it('uses last performance when present, including a non-null weight', () => {
    const planExercise = { reps: 8, weightKg: 60 };
    const last = { reps: 10, weightKg: 45 };

    expect(prefillFrom(planExercise, last)).toEqual({ reps: 10, weightKg: '45' });
  });

  it('treats a real last-performance entry with a null (bodyweight) weight as empty, not the plan target', () => {
    const planExercise = { reps: 8, weightKg: 60 };
    const last = { reps: 12, weightKg: null };

    expect(prefillFrom(planExercise, last)).toEqual({ reps: 12, weightKg: '' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm test -- plan-progress`
Expected: FAIL — `buildExerciseRows` is not exported (import error), plus `unloggedPlanExercises` no longer imported so no failures from that.

- [ ] **Step 3: Replace plan-progress.ts**

Replace the entire contents of `apps/web/src/features/tracker/lib/plan-progress.ts` with:

```ts
type PlanExerciseLike = {
  exercise: { id: string };
  sets: number;
  reps: number;
  weightKg: number | null;
};

type LoggedSet = { reps: number; weightKg: number | null };

type LoggedExerciseLike = { exercise: { id: string }; sets: LoggedSet[] };

type LastPerformanceLike = { exerciseId: string; reps: number; weightKg: number | null };

export type ExerciseRow<P extends PlanExerciseLike, L extends LoggedExerciseLike> = {
  key: string;
  exercise: P['exercise'] | L['exercise'];
  loggedExercise: L | null;
  placeholderCount: number;
  placeholderPrefill: { reps: number; weightKg: string };
};

type PrefillSource = { reps: number; weightKg: number | null };

/** Which reps/weight to pre-fill a set-log form with: `last` performance wins when present (even if its weight is null/bodyweight), otherwise falls back to the plan's stored target. */
export function prefillFrom(
  planExercise: PrefillSource,
  last?: PrefillSource,
): { reps: number; weightKg: string } {
  const source = last ?? planExercise;
  return {
    reps: source.reps,
    weightKg: source.weightKg == null ? '' : String(source.weightKg),
  };
}

/**
 * One row per plan exercise (plan order), followed by any logged exercises the
 * plan doesn't mention (ad-hoc adds, in their existing order). Each row carries
 * how many un-logged placeholder sets remain against the plan's target and what
 * to prefill them with: the exercise's own last logged set this session if it
 * has one, otherwise historical last performance, otherwise the plan's target.
 */
export function buildExerciseRows<P extends PlanExerciseLike, L extends LoggedExerciseLike>(
  plan: { exercises: P[] } | null | undefined,
  sessionExercises: L[],
  lastPerformance: LastPerformanceLike[] | undefined,
): ExerciseRow<P, L>[] {
  const loggedByExerciseId = new Map(sessionExercises.map((entry) => [entry.exercise.id, entry]));
  const planExerciseIds = new Set((plan?.exercises ?? []).map((entry) => entry.exercise.id));

  const planRows: ExerciseRow<P, L>[] = (plan?.exercises ?? []).map((planExercise) => {
    const loggedExercise = loggedByExerciseId.get(planExercise.exercise.id) ?? null;
    const placeholderCount = Math.max(0, planExercise.sets - (loggedExercise?.sets.length ?? 0));
    const lastLoggedSet = loggedExercise?.sets[loggedExercise.sets.length - 1];
    const placeholderPrefill = lastLoggedSet
      ? prefillFrom(lastLoggedSet)
      : prefillFrom(
          planExercise,
          lastPerformance?.find((entry) => entry.exerciseId === planExercise.exercise.id),
        );

    return {
      key: planExercise.exercise.id,
      exercise: planExercise.exercise,
      loggedExercise,
      placeholderCount,
      placeholderPrefill,
    };
  });

  const adHocRows: ExerciseRow<P, L>[] = sessionExercises
    .filter((entry) => !planExerciseIds.has(entry.exercise.id))
    .map((loggedExercise) => ({
      key: loggedExercise.exercise.id,
      exercise: loggedExercise.exercise,
      loggedExercise,
      placeholderCount: 0,
      placeholderPrefill: { reps: 0, weightKg: '' },
    }));

  return [...planRows, ...adHocRows];
}
```

Then add the concrete app-facing alias at the bottom of the same file:

```ts
import type { Exercise, TrainingSessionExercise, WorkoutExercise } from '@acme/contracts';

export type SessionExerciseRow = ExerciseRow<WorkoutExercise, TrainingSessionExercise>;
```

Move that `import type` line to the top of the file (with the rest of the file's imports — there are none today, so it becomes the file's only import line, placed above `type PlanExerciseLike = ...`). The unused `Exercise` import will be flagged by `tsc`/biome if not referenced directly — it isn't referenced by name elsewhere in this file, so drop it from the import and rely on `WorkoutExercise['exercise']` / `TrainingSessionExercise['exercise']` for exercise typing; the final top-of-file import is:

```ts
import type { TrainingSessionExercise, WorkoutExercise } from '@acme/contracts';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm test -- plan-progress`
Expected: PASS, 9 tests (6 `buildExerciseRows` + 3 `prefillFrom`).

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: no new errors from `plan-progress.ts` (errors from files Task 1 hasn't touched yet, like `index.tsx` still importing `unloggedPlanExercises`, are expected at this point and get fixed in Task 4 — confirm the only errors mention `index.tsx`/`exercise-log-card.tsx`, not `plan-progress.ts` itself).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/tracker/lib/plan-progress.ts apps/web/src/features/tracker/lib/plan-progress.test.ts
git commit -m "feat(web): add buildExerciseRows to merge plan targets with logged sets"
```

---

### Task 2: `PlannedSetRow` component

**Files:**
- Create: `apps/web/src/features/tracker/components/session-detail/planned-set-row.tsx`

**Interfaces:**
- Consumes: `CompactNumberInput` from `./number-inputs` (existing, unchanged), `apiClient.training.addSessionExercise` (existing endpoint, unchanged — the same one `AddSetForm` calls).
- Produces: `export function PlannedSetRow(props): JSX.Element` with props `{ sessionId: string; exerciseId: string; index: number; prefillReps: number; prefillWeightKg: string; onLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void }`. Task 3 renders one per remaining placeholder slot.

This is a thin wrapper around the same mutation `AddSetForm` (`apps/web/src/features/tracker/components/session-detail/add-set-form.tsx`) already uses, so there's no new backend behavior to unit test — same pattern as `AddSetForm`, which also has no dedicated test file. Verification happens via Task 6's manual pass and the existing typecheck/lint gates.

- [ ] **Step 1: Create the component**

```tsx
import type { AddTrainingSessionExerciseInput } from '@acme/contracts';
import { Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { CompactNumberInput } from './number-inputs';

export function PlannedSetRow({
  sessionId,
  exerciseId,
  index,
  prefillReps,
  prefillWeightKg,
  onLogged,
}: {
  sessionId: string;
  exerciseId: string;
  index: number;
  prefillReps: number;
  prefillWeightKg: string;
  onLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
}) {
  const { dict } = useLocale();
  const [reps, setReps] = useState(prefillReps);
  const [weightKg, setWeightKg] = useState(prefillWeightKg);

  const logSet = useMutation({
    mutationFn: async () => {
      const input: AddTrainingSessionExerciseInput = {
        exerciseId,
        reps,
        weightKg: weightKg === '' ? undefined : Number(weightKg),
      };
      const result = await apiClient.training.addSessionExercise({
        params: { sessionId },
        body: input,
      });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: (group) => {
      onLogged({ id: group.id, restSeconds: group.restSeconds });
    },
  });

  return (
    <div className="bg-muted/50 border-border flex flex-col gap-1 rounded-lg border border-dashed p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="bg-accent font-data text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">
          {index}
        </div>
        <div className="font-data flex flex-1 items-center gap-2 text-sm">
          <CompactNumberInput value={reps} onChange={(v) => setReps(Number(v))} />
          <span className="text-muted-foreground">×</span>
          <CompactNumberInput value={weightKg} onChange={setWeightKg} step="0.5" suffix="kg" />
        </div>
        <input
          type="checkbox"
          disabled={logSet.isPending}
          onChange={() => logSet.mutate()}
          aria-label={dict.activeTracking.logSet}
          className="accent-primary h-5 w-5 shrink-0"
        />
      </div>
      {logSet.isError && (
        <Text variant="caption" tone="destructive">
          {logSet.error.message}
        </Text>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: no errors from `planned-set-row.tsx` itself (it isn't imported anywhere yet, so it won't surface unused-file warnings — biome/tsc don't flag unimported-but-valid files).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/tracker/components/session-detail/planned-set-row.tsx
git commit -m "feat(web): add PlannedSetRow checklist component"
```

---

### Task 3: Wire placeholders into ExerciseLogCard

**Files:**
- Modify: `apps/web/src/features/tracker/components/session-detail/exercise-log-card.tsx`

**Interfaces:**
- Consumes: `SessionExerciseRow` from `../../lib/plan-progress` (Task 1), `PlannedSetRow` from `./planned-set-row` (Task 2).
- Produces: `ExerciseLogCard`'s prop shape changes from `{ sessionId, exercise: TrainingSessionExercise, onSetLogged, onChanged }` to `{ sessionId, row: SessionExerciseRow, onSetLogged, onChanged }`. Task 4 renders it with the new `row` prop instead of `exercise`.

- [ ] **Step 1: Replace exercise-log-card.tsx**

Replace the entire contents of `apps/web/src/features/tracker/components/session-detail/exercise-log-card.tsx` with:

```tsx
import { Card, Stack, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { Timer, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { ConfirmButton } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';
import type { SessionExerciseRow } from '../../lib/plan-progress';
import { AddSetForm } from './add-set-form';
import { formatDuration } from './format-duration';
import { EditableNumber } from './number-inputs';
import { PlannedSetRow } from './planned-set-row';

export function ExerciseLogCard({
  sessionId,
  row,
  onSetLogged,
  onChanged,
}: {
  sessionId: string;
  row: SessionExerciseRow;
  onSetLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
  onChanged: () => void;
}) {
  const { dict } = useLocale();
  const { exercise: catalogExercise, loggedExercise, placeholderCount, placeholderPrefill } = row;
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingRestBadge, setEditingRestBadge] = useState(false);

  const updateNotes = useMutation({
    mutationFn: async (notes: string | null) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.updateSessionExerciseNotes({
        params: { sessionId, exerciseId: loggedExercise.id },
        body: { notes },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: onChanged,
  });

  const updateRest = useMutation({
    mutationFn: async (value: number) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.updateSessionExerciseRest({
        params: { sessionId, exerciseId: loggedExercise.id },
        body: { restSeconds: value },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: onChanged,
  });

  const updateSet = useMutation({
    mutationFn: async ({
      setId,
      reps,
      weightKg,
    }: {
      setId: string;
      reps: number;
      weightKg: number | null;
    }) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.updateSessionSet({
        params: { sessionId, exerciseId: loggedExercise.id, setId },
        body: { reps, weightKg },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: onChanged,
  });

  const removeSet = useMutation({
    mutationFn: async (setId: string) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.removeSessionSet({
        params: { sessionId, exerciseId: loggedExercise.id, setId },
      });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: onChanged,
  });

  const removeExercise = useMutation({
    mutationFn: async () => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.removeSessionExercise({
        params: { sessionId, exerciseId: loggedExercise.id },
      });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: onChanged,
  });

  const loggedSets = loggedExercise?.sets ?? [];
  const lastSet = loggedSets[loggedSets.length - 1];
  // These edits close their input on commit, so a failed save is otherwise
  // invisible — surface whichever one is currently erroring.
  const mutationError = [updateNotes, updateRest, updateSet, removeSet, removeExercise].find(
    (mutation) => mutation.isError,
  )?.error;

  return (
    <Card className="glass-panel flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Text className="font-display text-primary text-lg uppercase">
            {catalogExercise.name}
          </Text>
          {loggedExercise &&
            (editingNotes ? (
              <input
                type="text"
                // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
                autoFocus
                defaultValue={loggedExercise.notes ?? ''}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  updateNotes.mutate(value === '' ? null : value);
                  setEditingNotes(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder={dict.sessionDetail.notesPlaceholder}
                className="text-muted-foreground font-data w-full bg-transparent text-xs outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingNotes(true)}
                className="text-muted-foreground hover:text-primary font-data text-left text-xs italic"
              >
                {loggedExercise.notes || dict.sessionDetail.notesPlaceholder}
              </button>
            ))}
        </div>
        {loggedExercise && (
          <ConfirmButton
            variant="ghost"
            size="sm"
            title={dict.planDetail.removeExerciseTitle}
            description={dict.sessionDetail.removeExerciseDescription(catalogExercise.name)}
            pending={removeExercise.isPending}
            onConfirm={() => removeExercise.mutate()}
            className="text-destructive h-7 w-7 shrink-0 p-0"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dict.sessionDetail.deleteWorkoutSr}</span>
          </ConfirmButton>
        )}
      </div>

      {loggedExercise && (
        <div className="flex items-center gap-1.5">
          <Timer className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
          {editingRestBadge ? (
            <input
              type="number"
              min={0}
              // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
              autoFocus
              defaultValue={loggedExercise.restSeconds ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                if (raw !== '') {
                  const value = Number(raw);
                  if (Number.isFinite(value)) updateRest.mutate(Math.max(0, value));
                }
                setEditingRestBadge(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="font-data text-muted-foreground w-14 bg-transparent text-xs outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingRestBadge(true)}
              className="text-muted-foreground hover:text-primary font-data text-xs"
            >
              {loggedExercise.restSeconds != null ? formatDuration(loggedExercise.restSeconds) : '—'}
            </button>
          )}
        </div>
      )}

      <Stack gap="xs">
        {loggedSets.map((set, index) => (
          <div
            key={set.id}
            className="bg-muted flex items-center justify-between gap-3 rounded-lg p-2"
          >
            <div className="bg-accent font-data flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">
              {index + 1}
            </div>
            <div className="font-data flex flex-1 items-center gap-2 text-sm">
              <EditableNumber
                value={set.reps}
                onCommit={(value) => {
                  // The API rejects reps < 1; ignore those like an empty commit.
                  if (value != null && value >= 1) {
                    updateSet.mutate({ setId: set.id, reps: value, weightKg: set.weightKg });
                  }
                }}
                className="text-primary tabular-nums"
              />
              <span className="text-muted-foreground">×</span>
              <EditableNumber
                value={set.weightKg}
                onCommit={(value) =>
                  updateSet.mutate({ setId: set.id, reps: set.reps, weightKg: value })
                }
                suffix=" kg"
                className="text-primary tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={() => removeSet.mutate(set.id)}
              className="text-muted-foreground hover:text-destructive shrink-0"
              aria-label={dict.sessionDetail.deleteSetSr}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <PlannedSetRow
            key={`placeholder-${i}`}
            sessionId={sessionId}
            exerciseId={catalogExercise.id}
            index={loggedSets.length + i + 1}
            prefillReps={placeholderPrefill.reps}
            prefillWeightKg={placeholderPrefill.weightKg}
            onLogged={onSetLogged}
          />
        ))}
      </Stack>

      {lastSet && (
        <AddSetForm
          // AddSetForm seeds its inputs once on mount; remount it whenever the
          // last set changes (added, deleted, or inline-edited) to re-seed.
          key={`${lastSet.id}:${lastSet.reps}:${lastSet.weightKg}`}
          sessionId={sessionId}
          exerciseId={catalogExercise.id}
          lastReps={lastSet.reps}
          lastWeightKg={lastSet.weightKg}
          onLogged={onSetLogged}
        />
      )}

      {mutationError && (
        <Text variant="caption" tone="destructive">
          {mutationError.message}
        </Text>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: no errors from `exercise-log-card.tsx` itself. Errors will still show for `index.tsx` (still calling `ExerciseLogCard` with the old `exercise` prop) — that's expected until Task 4.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/tracker/components/session-detail/exercise-log-card.tsx
git commit -m "feat(web): render placeholder set rows in ExerciseLogCard"
```

---

### Task 4: Merge into session-detail — delete Suggested Next, wire the row list

**Files:**
- Modify: `apps/web/src/features/tracker/components/session-detail/index.tsx`
- Modify: `apps/web/src/features/tracker/components/session-detail/add-session-exercise-card.tsx`

**Interfaces:**
- Consumes: `buildExerciseRows`/`SessionExerciseRow` (Task 1), `ExerciseLogCard`'s new `row` prop (Task 3).
- Produces: `AddSessionExerciseCard`'s prop shape shrinks from `{ sessionId, loggedExercises, selected, onSelect, reps, onRepsChange, weightKg, onWeightKgChange, onSetLogged }` to `{ sessionId, loggedExercises, onSetLogged }` — it now owns `selected`/`reps`/`weightKg` internally since nothing outside it sets them anymore.

- [ ] **Step 1: Replace add-session-exercise-card.tsx**

Replace the entire contents of `apps/web/src/features/tracker/components/session-detail/add-session-exercise-card.tsx` with:

```tsx
import type {
  AddTrainingSessionExerciseInput,
  Exercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { ExercisePicker } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';
import { alreadyTrainedGroups } from '../../lib/muscle-fatigue';
import { BigNumberInput } from './number-inputs';

export function AddSessionExerciseCard({
  sessionId,
  loggedExercises,
  onSetLogged,
}: {
  sessionId: string;
  loggedExercises: TrainingSessionWithExercises['exercises'];
  onSetLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
}) {
  const { dict } = useLocale();
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');

  const { data: lastPerformance } = useQuery({
    queryKey: ['last-performance', selected?.id],
    queryFn: async () => {
      if (!selected) return null;
      const result = await apiClient.training.lastPerformance({
        query: { exerciseIds: selected.id },
      });
      return result.status === 200 ? (result.body[0] ?? null) : null;
    },
    enabled: selected !== null,
  });

  const alreadyTrained = selected
    ? alreadyTrainedGroups(selected.muscleGroups, loggedExercises)
    : [];

  const addSet = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick an exercise first');
      const input: AddTrainingSessionExerciseInput = {
        exerciseId: selected.id,
        reps,
        weightKg: weightKg === '' ? undefined : Number(weightKg),
      };
      const result = await apiClient.training.addSessionExercise({
        params: { sessionId },
        body: input,
      });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: (group) => {
      const priorRestSeconds = lastPerformance?.restSeconds ?? null;
      setSelected(null);
      setReps(10);
      setWeightKg('');
      onSetLogged({ id: group.id, restSeconds: group.restSeconds ?? priorRestSeconds });
    },
  });

  return (
    <Card className="glass-panel flex flex-col gap-4">
      {selected && (
        <div className="flex items-start justify-between gap-2">
          <div>
            <Text
              variant="subheading"
              className="font-display text-primary block text-xl uppercase"
            >
              {selected.name}
            </Text>
            {lastPerformance && (
              <Text tone="muted" variant="caption" className="font-data block">
                {dict.activeTracking.lastTime(
                  lastPerformance.weightKg,
                  lastPerformance.reps,
                  lastPerformance.date,
                )}
              </Text>
            )}
            {alreadyTrained.length > 0 && (
              <Text tone="muted" variant="caption" className="font-data mt-1 block uppercase">
                {dict.activeTracking.alreadyTrained(alreadyTrained.join(', '))}
              </Text>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="font-data text-muted-foreground hover:text-primary text-xs uppercase"
          >
            {dict.common.change}
          </button>
        </div>
      )}
      {!selected ? (
        <ExercisePicker onSelect={setSelected} />
      ) : (
        <Stack gap="sm">
          <div className="grid grid-cols-2 gap-3">
            <BigNumberInput
              label={dict.common.reps}
              value={reps}
              onChange={(v) => setReps(Number(v))}
            />
            <BigNumberInput
              label={dict.common.weightKg}
              value={weightKg}
              step="0.5"
              onChange={setWeightKg}
            />
          </div>
          <button
            type="button"
            disabled={addSet.isPending}
            onClick={() => addSet.mutate()}
            className="bg-primary text-primary-foreground font-display w-full rounded-lg py-4 uppercase tracking-wider transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {addSet.isPending ? dict.common.logging : dict.activeTracking.logSet}
          </button>
        </Stack>
      )}
      {addSet.isError && (
        <Text variant="caption" tone="destructive">
          {addSet.error.message}
        </Text>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Replace index.tsx**

Replace the entire contents of `apps/web/src/features/tracker/components/session-detail/index.tsx` with:

```tsx
'use client';

import type { TrainingSessionWithExercises, WorkoutPlanWithExercises } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { ConfirmButton } from '@/shared/components';
import { useActiveSession, useActiveSessionStore } from '@/shared/hooks';
import { useLocale } from '@/shared/i18n/context';
import { trainingTypeStyles } from '@/utils';
import { buildExerciseRows } from '../../lib/plan-progress';
import { AddSessionExerciseCard } from './add-session-exercise-card';
import { ExerciseLogCard } from './exercise-log-card';
import { formatDuration } from './format-duration';
import { useCountdown, useElapsedTime } from './use-timers';

const REST_SECONDS = 90;

export function SessionDetail({
  session,
  plan,
}: {
  session: TrainingSessionWithExercises;
  plan?: WorkoutPlanWithExercises | null;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const style = trainingTypeStyles[session.type];
  const activeSession = useActiveSession();
  const isThisSessionActive = activeSession !== null && activeSession.sessionId === session.id;
  const completedDuration = isThisSessionActive ? null : session.durationSeconds;
  const duration = useElapsedTime(
    activeSession && isThisSessionActive ? activeSession.startedAt : null,
  );
  const start = useActiveSessionStore((state) => state.start);
  const end = useActiveSessionStore((state) => state.end);
  const [blocked, setBlocked] = useState(false);

  const handleStart = () => {
    if (activeSession && activeSession.sessionId !== session.id) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    start(session.id);
  };

  const finishSession = useMutation({
    mutationFn: async (durationSeconds: number) => {
      const result = await apiClient.training.finishSession({
        params: { id: session.id },
        body: { durationSeconds },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => {
      end();
      router.push('/tracker');
    },
  });

  const handleFinish = () => {
    if (!activeSession) return;
    const durationSeconds = Math.max(0, Math.floor((Date.now() - activeSession.startedAt) / 1000));
    finishSession.mutate(durationSeconds);
  };

  const [resting, setResting] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [restSeconds, setRestSeconds] = useState(REST_SECONDS);
  const [restExerciseLogId, setRestExerciseLogId] = useState<string | null>(null);
  const rest = useCountdown(resting, restSeconds);

  const planExerciseIds = plan?.exercises.map((exercise) => exercise.exercise.id) ?? [];

  const { data: lastPerformance } = useQuery({
    queryKey: ['last-performance', 'plan', plan?.id],
    queryFn: async () => {
      const result = await apiClient.training.lastPerformance({
        query: { exerciseIds: planExerciseIds.join(',') },
      });
      return result.status === 200 ? result.body : [];
    },
    enabled: planExerciseIds.length > 0,
  });

  const rows = buildExerciseRows(plan, session.exercises, lastPerformance);

  const removeSession = useMutation({
    mutationFn: async () => {
      const result = await apiClient.training.removeSession({ params: { id: session.id } });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: () => {
      if (isThisSessionActive) end();
      router.push('/tracker');
    },
  });

  const updateExerciseRest = useMutation({
    mutationFn: async ({
      exerciseLogId,
      restSeconds: value,
    }: {
      exerciseLogId: string;
      restSeconds: number;
    }) => {
      const result = await apiClient.training.updateSessionExerciseRest({
        params: { sessionId: session.id, exerciseId: exerciseLogId },
        body: { restSeconds: value },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
  });

  const handleAddRestTime = () => {
    const next = restSeconds + 15;
    setRestSeconds(next);
    rest.setRemaining(rest.remaining + 15);
    if (restExerciseLogId) {
      updateExerciseRest.mutate({ exerciseLogId: restExerciseLogId, restSeconds: next });
    }
  };

  const handleResetRest = () => {
    rest.setRemaining(restSeconds);
  };

  const handleSetLogged = (logged: { id: string; restSeconds: number | null }) => {
    setRestExerciseLogId(logged.id);
    setRestSeconds(logged.restSeconds ?? REST_SECONDS);
    setResting(true);
    router.refresh();
  };

  return (
    <Stack gap="lg" className="pb-24">
      <Link
        href="/tracker"
        className="text-muted-foreground hover:text-primary flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.nav.tracking}
      </Link>

      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
          {dict.activeTracking.duration}
        </Text>
        {isThisSessionActive ? (
          <span className="font-display text-glow-primary text-primary text-6xl tabular-nums">
            {duration}
          </span>
        ) : completedDuration != null ? (
          <span className="font-display text-primary text-6xl tabular-nums">
            {formatDuration(completedDuration)}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="bg-primary text-primary-foreground font-display glow-primary rounded-full px-8 py-3 text-2xl uppercase tracking-wider transition-colors active:scale-95"
          >
            {dict.activeTracking.start}
          </button>
        )}
        {blocked && activeSession && !isThisSessionActive && (
          <Text tone="destructive" variant="caption">
            {dict.activeTracking.alreadyActive}{' '}
            <Link href={`/tracker/${activeSession.sessionId}`} className="underline">
              {dict.activeTracking.goToActive}
            </Link>
          </Text>
        )}
        <div className="flex items-center gap-2">
          <span className={`font-data rounded-full px-2 py-0.5 text-xs uppercase ${style.badge}`}>
            {dict.trainingType[session.type]} · {session.date}
          </span>
          <ConfirmButton
            variant="ghost"
            size="sm"
            title={dict.sessionDetail.deleteTitle}
            description={dict.sessionDetail.deleteDescription}
            pending={removeSession.isPending}
            onConfirm={() => removeSession.mutate()}
            className="text-destructive h-7 w-7 p-0"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dict.sessionDetail.deleteWorkoutSr}</span>
          </ConfirmButton>
        </div>
      </div>

      {session.notes && (
        <Card className="glass-panel">
          <Text tone="muted">{session.notes}</Text>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card className="glass-panel">
          <Text tone="muted">{dict.sessionDetail.noSets}</Text>
        </Card>
      ) : (
        <Stack gap="sm">
          <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
            {dict.activeTracking.loggedExercises}
          </Text>
          {rows.map((row) => (
            <ExerciseLogCard
              key={row.key}
              sessionId={session.id}
              row={row}
              onSetLogged={handleSetLogged}
              onChanged={() => router.refresh()}
            />
          ))}
        </Stack>
      )}

      <AddSessionExerciseCard
        sessionId={session.id}
        loggedExercises={session.exercises}
        onSetLogged={handleSetLogged}
      />

      {(resting || isThisSessionActive) && (
        <div className="glass-panel fixed inset-x-4 bottom-[76px] z-40 flex items-center justify-between gap-3 rounded-full p-2 md:right-6 md:bottom-24 md:left-auto md:w-auto">
          {resting ? (
            <div className="bg-muted flex items-center gap-3 rounded-full px-4 py-2">
              <Timer className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              <Text tone="muted" variant="caption" className="font-data uppercase">
                {dict.activeTracking.resting}
              </Text>
              {editingRest ? (
                <input
                  type="number"
                  min={0}
                  // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
                  autoFocus
                  defaultValue={rest.remaining}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    const next = Number.isFinite(value) ? Math.max(0, value) : rest.remaining;
                    rest.setRemaining(next);
                    setRestSeconds(next);
                    setEditingRest(false);
                    if (restExerciseLogId) {
                      updateExerciseRest.mutate({
                        exerciseLogId: restExerciseLogId,
                        restSeconds: next,
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="font-display text-primary w-14 bg-transparent text-xl tabular-nums outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingRest(true)}
                  className={`font-display text-xl tabular-nums ${rest.done ? 'text-destructive' : 'text-primary'}`}
                >
                  {rest.display}
                </button>
              )}
              <button
                type="button"
                onClick={handleAddRestTime}
                className="bg-accent hover:text-primary font-data rounded-full px-2 py-1 text-xs uppercase transition-colors"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={handleResetRest}
                className="bg-accent hover:text-primary flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                aria-label="Reset rest timer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setResting(false);
                  setEditingRest(false);
                }}
                className="bg-accent hover:text-primary flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                aria-label="Skip rest"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <span />
          )}
          {isThisSessionActive && (
            <ConfirmButton
              variant="outline"
              title={dict.sessionDetail.finishTitle}
              description={dict.sessionDetail.finishDescription}
              confirmLabel={dict.common.finish}
              pending={finishSession.isPending}
              onConfirm={handleFinish}
              className="border-primary text-primary font-display shrink-0 gap-2 rounded-full uppercase"
            >
              <Flag className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              {dict.common.finish}
            </ConfirmButton>
          )}
        </div>
      )}
    </Stack>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS, no errors.

- [ ] **Step 4: Lint**

Run: `cd apps/web && pnpm lint`
Expected: PASS (biome flags unused imports/vars — this confirms `Exercise`, `prefillFrom`, `unloggedPlanExercises` etc. are fully gone from `index.tsx`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tracker/components/session-detail/index.tsx apps/web/src/features/tracker/components/session-detail/add-session-exercise-card.tsx
git commit -m "feat(web): merge Suggested Next into the prefilled exercise checklist"
```

---

### Task 5: i18n copy

**Files:**
- Modify: `apps/web/src/shared/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/shared/i18n/dictionaries/pl.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `dict.activeTracking.suggestedNext` and `dict.sessionDetail.exerciseLine` no longer exist (both are unused after Task 4 deleted their only call sites). `dict.activeTracking.loggedExercises` value changes.

- [ ] **Step 1: Edit en.ts**

In `apps/web/src/shared/i18n/dictionaries/en.ts`, in the `activeTracking` block:

```ts
    logSet: 'Log Set',
    loggedExercises: 'Exercises',
    resting: 'Resting…',
    lastTime: (weightKg: number | null, reps: number, date: string) =>
      `Last time: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps (${date})`,
    alreadyTrained: (muscleGroups: string) => `Already trained today: ${muscleGroups}`,
  },
```

(This removes the `suggestedNext:` line and changes `loggedExercises` from `'Logged Exercises'` to `'Exercises'`.)

In the `sessionDetail` block, remove the `exerciseLine` entry:

```ts
  sessionDetail: {
    loginRequired: 'Log in to see this training session.',
    deleteTitle: 'Delete this training?',
    deleteDescription:
      'This training session and its logged exercises will be permanently deleted.',
    deleteWorkoutSr: 'Delete workout',
    noSets: 'No sets logged yet — log your first one above.',
    notesPlaceholder: 'Add a note…',
    deleteSetSr: 'Delete set',
    finishTitle: 'Finish this workout?',
    finishDescription: 'You can keep logging sets later — this just takes you back to Tracking.',
    removeExerciseDescription: (name: string) => `"${name}" will be removed from this training.`,
  },
```

- [ ] **Step 2: Edit pl.ts**

In `apps/web/src/shared/i18n/dictionaries/pl.ts`, in the `activeTracking` block:

```ts
    logSet: 'Zapisz serię',
    loggedExercises: 'Ćwiczenia',
    resting: 'Odpoczynek…',
    lastTime: (weightKg: number | null, reps: number, date: string) =>
      `Poprzednio: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. (${date})`,
    alreadyTrained: (muscleGroups: string) => `Już trenowane dziś: ${muscleGroups}`,
  },
```

In the `sessionDetail` block, remove the `exerciseLine` entry:

```ts
  sessionDetail: {
    loginRequired: 'Zaloguj się, aby zobaczyć ten trening.',
    deleteTitle: 'Usunąć ten trening?',
    deleteDescription: 'Ten trening i wszystkie zapisane w nim ćwiczenia zostaną trwale usunięte.',
    deleteWorkoutSr: 'Usuń trening',
    noSets: 'Brak zapisanych serii — zapisz pierwszą powyżej.',
    notesPlaceholder: 'Dodaj notatkę…',
    deleteSetSr: 'Usuń serię',
    finishTitle: 'Zakończyć ten trening?',
    finishDescription:
      'Możesz wrócić do zapisywania serii później — to tylko przenosi Cię z powrotem do Śledzenia.',
    removeExerciseDescription: (name: string) => `„${name}” zostanie usunięte z tego treningu.`,
  },
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && pnpm typecheck && pnpm lint`
Expected: PASS. If either dictionary type is a shared `Dictionary` interface (check `apps/web/src/shared/i18n/dictionaries/en.ts`'s export — it's likely the canonical type others structurally match), confirm `pl.ts` still satisfies it after removing the same two keys from both.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/i18n/dictionaries/en.ts apps/web/src/shared/i18n/dictionaries/pl.ts
git commit -m "chore(web): retitle Exercises section, drop Suggested Next copy"
```

---

### Task 6: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `cd apps/web && pnpm test`
Expected: PASS, all suites green (including the untouched `muscle-fatigue.test.ts`).

- [ ] **Step 2: Start the dev server**

Run: `cd apps/web && pnpm dev`

- [ ] **Step 3: Fresh plan session — placeholders appear with no taps**

Open a training session tied to a plan that has an exercise with `sets: 4` and no sets logged yet. Confirm the exercise card appears immediately under "Exercises" with 4 unchecked rows, reps/weight prefilled (from last performance if any exists for that exercise, otherwise the plan's target).

- [ ] **Step 4: Checking a placeholder logs it**

Check the first row's checkbox. Confirm: the row becomes a real editable set row (same look as previously-logged sets, with the × delete button), the rest-timer pill appears at the bottom, and 3 unchecked placeholders remain.

- [ ] **Step 5: Editing before checking uses the edited value**

On a remaining placeholder, change the weight field, then check its box. Confirm the resulting logged set shows the edited weight, not the original prefill.

- [ ] **Step 6: Fully checking still allows an extra set**

Check all remaining placeholders for that exercise. Confirm the "+ add set" form (`AddSetForm`) is still present below the now-4 logged sets, and using it adds a 5th.

- [ ] **Step 7: Ad-hoc exercise has no placeholders**

Use the exercise picker (now below the exercise list) to add an exercise not in the plan. Confirm its card has zero placeholder rows — just the one set just logged plus the "+ add set" form.

- [ ] **Step 8: No plan session unaffected**

Open (or start) a training session with no plan attached. Confirm the page shows the empty-state message until the first exercise is added via the picker, then behaves exactly as it does today (no placeholders, since there's no plan to generate them from).

No commit for this task — verification only.

---

## Self-review notes

- **Spec coverage:** every "Frontend" bullet in the spec maps to a task (`buildExerciseRows` → Task 1, `PlannedSetRow` → Task 2, `ExerciseLogCard` placeholders → Task 3, `index.tsx`/`AddSessionExerciseCard` merge → Task 4, i18n → Task 5); the spec's full manual-verification list is Task 6's steps 3–8 verbatim.
- **Type consistency checked:** `SessionExerciseRow` (Task 1) is the exact type threaded through `ExerciseLogCard`'s `row` prop (Task 3) and `index.tsx`'s `rows.map` (Task 4); `PlannedSetRow`'s prop names (`prefillReps`, `prefillWeightKg`, `onLogged`) match how Task 3 calls it.
- **No placeholders:** every step above contains complete, pasteable code — no "TBD" or "similar to Task N".
