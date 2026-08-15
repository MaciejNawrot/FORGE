'use client';

import type { WorkoutPlanWithExercises } from '@acme/contracts';
import { updateWorkoutPlanInputSchema } from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { apiClient } from '@/shared/api';
import { ConfirmButton } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';
import { AddPlanExerciseCard } from './add-plan-exercise-card';
import { ExerciseEditRow } from './exercise-edit-row';
import { ExerciseRow } from './exercise-row';

type PlanFormValues = z.infer<typeof updateWorkoutPlanInputSchema>;

export function PlanDetail({ plan }: { plan: WorkoutPlanWithExercises }) {
  const router = useRouter();
  const { dict } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(updateWorkoutPlanInputSchema),
    defaultValues: { name: plan.name, notes: plan.notes ?? '' },
  });

  const updatePlan = useMutation({
    mutationFn: async (values: PlanFormValues) => {
      const result = await apiClient.workouts.updatePlan({ params: { id: plan.id }, body: values });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => router.refresh(),
  });

  const removePlan = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removePlan({ params: { id: plan.id } });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: () => router.push('/plans'),
  });

  return (
    <Stack gap="lg">
      <Stack direction="row" justify="between" align="center">
        <Text variant="heading">{plan.name}</Text>
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={dict.planDetail.deletePlanTitle}
          description={dict.planDetail.deletePlanDescription(plan.name)}
          pending={removePlan.isPending}
          onConfirm={() => removePlan.mutate()}
        >
          {dict.planDetail.deletePlan}
        </ConfirmButton>
      </Stack>

      <Card>
        <form onSubmit={planForm.handleSubmit((values) => updatePlan.mutate(values))}>
          <Stack gap="sm">
            <Stack gap="xs">
              <Text variant="caption">{dict.common.name}</Text>
              <Input {...planForm.register('name')} />
              {planForm.formState.errors.name && (
                <Text variant="caption" tone="destructive">
                  {planForm.formState.errors.name.message}
                </Text>
              )}
            </Stack>
            <Stack gap="xs">
              <Text variant="caption">{dict.planDetail.notes}</Text>
              <textarea
                className="border-border bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none"
                rows={2}
                {...planForm.register('notes')}
              />
            </Stack>
            <Stack direction="row" gap="sm" align="center">
              <Button type="submit" size="sm" disabled={updatePlan.isPending}>
                {updatePlan.isPending ? dict.common.saving : dict.common.save}
              </Button>
              {updatePlan.isError && (
                <Text variant="caption" tone="destructive">
                  {updatePlan.error.message}
                </Text>
              )}
            </Stack>
          </Stack>
        </form>
      </Card>

      <Card>
        <Text variant="subheading" className="mb-3 block">
          {dict.planDetail.exercisesHeading}
        </Text>
        {plan.exercises.length === 0 ? (
          <Text tone="muted">{dict.planDetail.noExercises}</Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.common.name}</TableHead>
                <TableHead>{dict.common.sets}</TableHead>
                <TableHead>{dict.common.reps}</TableHead>
                <TableHead>{dict.common.weightKg}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.exercises.map((exercise) =>
                editingId === exercise.id ? (
                  <ExerciseEditRow
                    key={exercise.id}
                    planId={plan.id}
                    exercise={exercise}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ExerciseRow
                    key={exercise.id}
                    planId={plan.id}
                    exercise={exercise}
                    onEdit={() => setEditingId(exercise.id)}
                    onRemoved={() => router.refresh()}
                  />
                ),
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <AddPlanExerciseCard planId={plan.id} onAdded={() => router.refresh()} />
    </Stack>
  );
}
