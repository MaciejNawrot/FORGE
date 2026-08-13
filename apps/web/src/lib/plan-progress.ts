/** Plan exercises whose catalog exercise id has no matching entry in `loggedExercises`. */
export function unloggedPlanExercises<
  P extends { exercise: { id: string } },
  L extends { exercise: { id: string } },
>(planExercises: P[], loggedExercises: L[]): P[] {
  const loggedIds = new Set(loggedExercises.map((entry) => entry.exercise.id));
  return planExercises.filter((entry) => !loggedIds.has(entry.exercise.id));
}
