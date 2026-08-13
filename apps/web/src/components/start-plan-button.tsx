'use client';

import type { TrainingTypeValue } from '@acme/contracts';
import { Button } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';
import { toLocalIsoDate } from '@/lib/training-colors';

export function StartPlanButton({
  planId,
  category,
}: {
  planId: string;
  category: TrainingTypeValue | null;
}) {
  const router = useRouter();
  const { dict } = useLocale();

  const mutation = useMutation({
    mutationFn: async () => {
      const sessionResult = await apiClient.training.createSession({
        body: {
          date: toLocalIsoDate(new Date()),
          type: category ?? 'strength',
          planId,
        },
      });
      if (sessionResult.status !== 201) throw new Error(sessionResult.body.message);
      return sessionResult.body;
    },
    onSuccess: (session) => router.push(`/tracker/${session.id}`),
  });

  return (
    <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? dict.tracker.starting : dict.tracker.start}
    </Button>
  );
}
