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
      const [planResult, catalogResult] = await Promise.all([
        apiClient.workouts.getPlan({ params: { id: planId } }),
        apiClient.exercises.listExercises({ query: {} }),
      ]);
      if (planResult.status !== 200) throw new Error(planResult.body.message);
      if (catalogResult.status !== 200) throw new Error('Failed to load exercise catalog');

      const catalogIdByName = new Map(
        catalogResult.body.map((exercise) => [exercise.name.toLowerCase(), exercise.id]),
      );

      const sessionResult = await apiClient.training.createSession({
        body: { date: toLocalIsoDate(new Date()), type: planResult.body.category ?? 'strength' },
      });
      if (sessionResult.status !== 201) throw new Error(sessionResult.body.message);
      const session = sessionResult.body;

      // Plan exercises are free-text names; only ones matching the catalog exactly can be
      // logged (training sessions log against a real exercise id). Others are skipped.
      await Promise.all(
        planResult.body.exercises.map((exercise) => {
          const exerciseId = catalogIdByName.get(exercise.name.toLowerCase());
          if (!exerciseId) return undefined;
          return apiClient.training.addSessionExercise({
            params: { sessionId: session.id },
            body: {
              exerciseId,
              sets: exercise.sets,
              reps: exercise.reps,
              weightKg: exercise.weightKg ?? undefined,
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
