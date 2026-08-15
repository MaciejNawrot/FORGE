'use client';

import { Button } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';

export function ForkTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { dict } = useLocale();

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.forkPlan({ params: { id: templateId } });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: (plan) => router.push(`/plans/${plan.id}`),
  });

  return (
    <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? dict.common.adding : dict.forkTemplate.cta}
    </Button>
  );
}
