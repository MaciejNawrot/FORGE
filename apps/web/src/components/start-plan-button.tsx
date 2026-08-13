'use client';

import { Button } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';
import { toLocalIsoDate } from '@/lib/training-colors';

export function StartPlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const { dict } = useLocale();

  const mutation = useMutation({
    mutationFn: async () => {
      const planResult = await apiClient.workouts.getPlan({ params: { id: planId } });
      if (planResult.status !== 200) throw new Error(planResult.body.message);
      const plan = planResult.body;

      const lastPerformanceByExerciseId = new Map<
        string,
        { sets: number; reps: number; weightKg: number | null }
      >();
      if (plan.exercises.length > 0) {
        const lastPerformanceResult = await apiClient.training.lastPerformance({
          query: { exerciseIds: plan.exercises.map((exercise) => exercise.exercise.id).join(',') },
        });
        if (lastPerformanceResult.status === 200) {
          for (const entry of lastPerformanceResult.body) {
            lastPerformanceByExerciseId.set(entry.exerciseId, entry);
          }
        }
      }

      const sessionResult = await apiClient.training.createSession({
        body: {
          date: toLocalIsoDate(new Date()),
          type: plan.category ?? 'strength',
          planId: plan.id,
        },
      });
      if (sessionResult.status !== 201) throw new Error(sessionResult.body.message);
      const session = sessionResult.body;

      await Promise.all(
        plan.exercises.map((exercise) => {
          const last = lastPerformanceByExerciseId.get(exercise.exercise.id);
          return apiClient.training.addSessionExercise({
            params: { sessionId: session.id },
            body: {
              exerciseId: exercise.exercise.id,
              sets: last?.sets ?? exercise.sets,
              reps: last?.reps ?? exercise.reps,
              weightKg: last?.weightKg ?? exercise.weightKg ?? undefined,
            },
          });
        }),
      );

      return session;
    },
    onSuccess: (session) => router.push(`/tracker/${session.id}`),
  });

  return (
    <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? dict.tracker.starting : dict.tracker.start}
    </Button>
  );
}
