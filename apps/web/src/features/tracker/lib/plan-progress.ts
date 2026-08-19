import type { TrainingSessionExercise, WorkoutExercise } from '@acme/contracts';

type PlanExerciseLike = {
  exercise: { id: string };
  sets: number;
  reps: number;
  weightKg: number | null;
  pairGroupId: string | null;
};

type LoggedSet = { reps: number; weightKg: number | null };

type LoggedExerciseLike = {
  exercise: { id: string };
  sets: LoggedSet[];
  pairGroupId: string | null;
};

type LastPerformanceLike = { exerciseId: string; reps: number; weightKg: number | null };

export type ExerciseRow<P extends PlanExerciseLike, L extends LoggedExerciseLike> = {
  key: string;
  exercise: P['exercise'] | L['exercise'];
  loggedExercise: L | null;
  placeholderCount: number;
  placeholderPrefill: { reps: number; weightKg: string };
  pairGroupId: string | null;
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
      pairGroupId: loggedExercise?.pairGroupId ?? planExercise.pairGroupId,
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
      pairGroupId: loggedExercise.pairGroupId,
    }));

  return [...planRows, ...adHocRows];
}

/**
 * Collapses adjacent rows sharing a `pairGroupId` into a 2-tuple; everything
 * else stays a single row. Relies on the API always keeping paired rows
 * adjacent (see `linkPairGroup`/`pairExercises` on the backend) — a row
 * whose partner isn't its immediate neighbor is left ungrouped rather than
 * searched for, since that would indicate the adjacency invariant broke.
 */
export function groupPairedRows<P extends PlanExerciseLike, L extends LoggedExerciseLike>(
  rows: ExerciseRow<P, L>[],
): (ExerciseRow<P, L> | [ExerciseRow<P, L>, ExerciseRow<P, L>])[] {
  const result: (ExerciseRow<P, L> | [ExerciseRow<P, L>, ExerciseRow<P, L>])[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const next = rows[i + 1];
    if (row.pairGroupId && next && next.pairGroupId === row.pairGroupId) {
      result.push([row, next]);
      i++;
    } else {
      result.push(row);
    }
  }
  return result;
}

export type SessionExerciseRow = ExerciseRow<WorkoutExercise, TrainingSessionExercise>;
