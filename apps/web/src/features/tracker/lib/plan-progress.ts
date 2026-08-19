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
 * Collapses rows sharing a `pairGroupId` into a 2-tuple, placed at the
 * earlier row's position; everything else stays a single row. Rows for a
 * plan-driven session render in plan order, not `TrainingSessionExercise`'s
 * own `position` — the two orderings aren't the same array, so a paired
 * partner can land anywhere in `rows`, not necessarily next to its match.
 * This searches the whole list rather than assuming adjacency.
 */
export function groupPairedRows<P extends PlanExerciseLike, L extends LoggedExerciseLike>(
  rows: ExerciseRow<P, L>[],
): (ExerciseRow<P, L> | [ExerciseRow<P, L>, ExerciseRow<P, L>])[] {
  const result: (ExerciseRow<P, L> | [ExerciseRow<P, L>, ExerciseRow<P, L>])[] = [];
  const consumed = new Set<string>();
  for (const row of rows) {
    if (consumed.has(row.key)) continue;
    const partner = row.pairGroupId
      ? rows.find((other) => other.key !== row.key && other.pairGroupId === row.pairGroupId)
      : undefined;
    if (partner) {
      result.push([row, partner]);
      consumed.add(row.key);
      consumed.add(partner.key);
    } else {
      result.push(row);
      consumed.add(row.key);
    }
  }
  return result;
}

export type SessionExerciseRow = ExerciseRow<WorkoutExercise, TrainingSessionExercise>;
