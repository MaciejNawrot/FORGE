'use client';

import type { WorkoutPlanListItem } from '@acme/contracts';
import { Card, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, unwrapResult } from '@/shared/api';
import { ConfirmButton } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';
import { trainingTypeStyles } from '@/utils';

export function PlanListItem({ plan }: { plan: WorkoutPlanListItem }) {
  const router = useRouter();
  const { dict } = useLocale();
  const category = plan.category;
  const style = category ? trainingTypeStyles[category] : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removePlan({ params: { id: plan.id } });
      unwrapResult(result, 204);
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <Card className="glass-panel relative flex h-48 flex-col justify-between overflow-hidden">
      <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-2">
        {style && category ? (
          <span className={`font-data rounded-full px-2 py-1 text-xs uppercase ${style.badge}`}>
            {dict.trainingType[category]}
          </span>
        ) : (
          <span />
        )}
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={dict.planDetail.deletePlanTitle}
          description={dict.planDetail.deletePlanDescription(plan.name)}
          pending={mutation.isPending}
          onConfirm={() => mutation.mutate()}
        >
          {dict.common.delete}
        </ConfirmButton>
      </div>
      <Link href={`/plans/${plan.id}`} className="relative z-10 flex flex-col gap-2">
        <Text
          variant="subheading"
          className="font-display text-primary truncate text-2xl uppercase"
        >
          {plan.name}
        </Text>
        {plan.notes && (
          <Text tone="muted" variant="caption" className="line-clamp-2">
            {plan.notes}
          </Text>
        )}
        <div className="text-muted-foreground font-data flex items-center gap-1 text-xs">
          <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
          {dict.common.exerciseCount(plan.exerciseCount)}
        </div>
      </Link>
    </Card>
  );
}
