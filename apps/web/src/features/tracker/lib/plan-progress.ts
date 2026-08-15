/** Plan exercises whose catalog exercise id has no matching entry in `loggedExercises`. */
export function unloggedPlanExercises<
  P extends { exercise: { id: string } },
  L extends { exercise: { id: string } },
>(planExercises: P[], loggedExercises: L[]): P[] {
  const loggedIds = new Set(loggedExercises.map((entry) => entry.exercise.id));
  return planExercises.filter((entry) => !loggedIds.has(entry.exercise.id));
}

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
