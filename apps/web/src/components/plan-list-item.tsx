'use client';

import type { WorkoutPlanListItem } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/confirm-button';
import { apiClient } from '@/lib/api-client';

export function PlanListItem({ plan }: { plan: WorkoutPlanListItem }) {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removePlan({ params: { id: plan.id } });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <Card>
      <Stack direction="row" justify="between" align="center" gap="sm">
        <Link href={`/plans/${plan.id}`} className="min-w-0 flex-1">
          <Text variant="subheading" className="truncate">
            {plan.name}
          </Text>
          <Text tone="muted" variant="caption" className="block truncate">
            {plan.exerciseCount} {plan.exerciseCount === 1 ? 'exercise' : 'exercises'}
            {plan.notes ? ` · ${plan.notes}` : ''}
          </Text>
        </Link>
        <ConfirmButton
          variant="ghost"
          size="sm"
          title="Delete this plan?"
          description={`"${plan.name}" and all of its exercises will be permanently deleted.`}
          pending={mutation.isPending}
          onConfirm={() => mutation.mutate()}
        >
          Delete
        </ConfirmButton>
      </Stack>
    </Card>
  );
}
