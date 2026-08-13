type LoggedExercise = { exercise: { muscleGroups: string[] } };

function trainedMuscleGroups(loggedExercises: LoggedExercise[]): Set<string> {
  const groups = new Set<string>();
  for (const entry of loggedExercises) {
    for (const group of entry.exercise.muscleGroups) groups.add(group);
  }
  return groups;
}

/** Which of `candidateMuscleGroups` were already hit by exercises logged earlier in the session. */
export function alreadyTrainedGroups(
  candidateMuscleGroups: string[],
  loggedExercises: LoggedExercise[],
): string[] {
  const trained = trainedMuscleGroups(loggedExercises);
  return candidateMuscleGroups.filter((group) => trained.has(group));
}
