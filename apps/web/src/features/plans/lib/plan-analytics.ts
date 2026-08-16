type SetLike = { reps: number; weightKg: number | null };
type ExerciseLike = { exercise: { name: string }; sets: SetLike[] };
type SessionLike = { date: string; durationSeconds: number | null; exercises: ExerciseLike[] };

export type PlanStats = {
  totalVolumeKg: number;
  sessionCount: number;
  avgDurationSeconds: number;
  bestByExercise: Map<string, { weight: number; reps: number; date: string }>;
  volumeBySession: { date: string; volume: number }[];
};

/** Volume/duration/best-set summary for the sessions logged from one plan. */
export function computePlanStats(sessions: SessionLike[]): PlanStats {
  const bestByExercise = new Map<string, { weight: number; reps: number; date: string }>();

  const volumeBySession = sessions.map((session) => {
    let volume = 0;
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const weight = set.weightKg ?? 0;
        volume += set.reps * weight;
        const best = bestByExercise.get(exercise.exercise.name);
        if (weight > 0 && (!best || weight > best.weight)) {
          bestByExercise.set(exercise.exercise.name, {
            weight,
            reps: set.reps,
            date: session.date,
          });
        }
      }
    }
    return { date: session.date, volume };
  });

  const totalVolumeKg = volumeBySession.reduce((sum, entry) => sum + entry.volume, 0);
  const totalDuration = sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const avgDurationSeconds = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;

  return {
    totalVolumeKg,
    sessionCount: sessions.length,
    avgDurationSeconds,
    bestByExercise,
    volumeBySession,
  };
}
