'use client';

import type { WorkoutPlanWithExercises } from '@acme/contracts';
import { updateWorkoutPlanInputSchema } from '@acme/contracts';
import { Badge, Button, Card, Input, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Dumbbell, Repeat } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { apiClient, unwrapResult } from '@/shared/api';
import { ConfirmButton } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';
import { trainingTypeStyles } from '@/utils';
import { AddPlanExerciseCard } from './add-plan-exercise-card';
import { ExerciseEditRow } from './exercise-edit-row';
import { ExerciseRow } from './exercise-row';

type PlanFormValues = z.infer<typeof updateWorkoutPlanInputSchema>;

export function PlanDetail({ plan }: { plan: WorkoutPlanWithExercises }) {
  const router = useRouter();
  const { dict } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const category = plan.category;
  const style = category ? trainingTypeStyles[category] : null;
  const totalSets = plan.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(updateWorkoutPlanInputSchema),
    defaultValues: { name: plan.name, notes: plan.notes ?? '' },
  });

  const updatePlan = useMutation({
    mutationFn: async (values: PlanFormValues) => {
      const result = await apiClient.workouts.updatePlan({ params: { id: plan.id }, body: values });
      return unwrapResult(result, 200);
    },
    onSuccess: () => router.refresh(),
  });

  const removePlan = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removePlan({ params: { id: plan.id } });
      unwrapResult(result, 204);
    },
    onSuccess: () => router.push('/plans'),
  });

  const pairExercise = useMutation({
    mutationFn: async ({
      exerciseId,
      pairWithExerciseId,
    }: {
      exerciseId: string;
      pairWithExerciseId: string;
    }) => {
      const result = await apiClient.workouts.pairExercise({
        params: { planId: plan.id, exerciseId },
        body: { pairWithExerciseId },
      });
      return unwrapResult(result, 200);
    },
    onSuccess: () => router.refresh(),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    pairExercise.mutate({ exerciseId: String(active.id), pairWithExerciseId: String(over.id) });
  };

  return (
    <Stack gap="lg" className="pb-24">
      <Link
        href="/plans"
        className="text-muted-foreground hover:text-primary flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.plans.title}
      </Link>

      <section className="glass-panel relative overflow-hidden rounded-3xl p-8">
        <div className="from-primary/20 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
        <form
          onSubmit={planForm.handleSubmit((values) => updatePlan.mutate(values))}
          className="relative z-10 flex flex-col gap-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="font-data flex flex-wrap gap-2 text-xs uppercase">
              {style && category && (
                <Badge className={style.badge}>{dict.trainingType[category]}</Badge>
              )}
              <Badge tone="muted">
                <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
                {dict.common.exerciseCount(plan.exercises.length)}
              </Badge>
              <Badge tone="muted">
                <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                {dict.common.setCount(totalSets)}
              </Badge>
            </div>
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
          </div>

          <Input
            {...planForm.register('name')}
            className="font-display text-primary h-auto border-none bg-transparent p-0 text-4xl uppercase focus-visible:ring-0 md:text-5xl"
          />
          {planForm.formState.errors.name && (
            <Text variant="caption" tone="destructive">
              {planForm.formState.errors.name.message}
            </Text>
          )}
          <textarea
            placeholder={dict.planDetail.notes}
            rows={2}
            {...planForm.register('notes')}
            className="text-muted-foreground placeholder:text-muted-foreground w-full max-w-xl resize-none bg-transparent text-sm outline-none"
          />
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
        </form>
      </section>

      <Card className="glass-panel">
        <Text variant="subheading" className="font-display mb-3 block text-xl uppercase">
          {dict.planDetail.exercisesHeading}
        </Text>
        {plan.exercises.length === 0 ? (
          <Text tone="muted">{dict.planDetail.noExercises}</Text>
        ) : (
          <DndContext onDragEnd={handleDragEnd}>
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
                {plan.exercises.map((exercise) => {
                  if (editingId === exercise.id) {
                    return (
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
                    );
                  }
                  const partner = exercise.pairGroupId
                    ? plan.exercises.find(
                        (e) => e.id !== exercise.id && e.pairGroupId === exercise.pairGroupId,
                      )
                    : undefined;
                  const pairableExercises = plan.exercises.filter(
                    (e) => e.id !== exercise.id && !e.pairGroupId,
                  );
                  return (
                    <ExerciseRow
                      key={exercise.id}
                      planId={plan.id}
                      exercise={exercise}
                      pairedExerciseName={partner?.exercise.name ?? null}
                      pairableExercises={pairableExercises}
                      onEdit={() => setEditingId(exercise.id)}
                      onRemoved={() => router.refresh()}
                      onPair={(pairWithExerciseId) =>
                        pairExercise.mutate({ exerciseId: exercise.id, pairWithExerciseId })
                      }
                      onChanged={() => router.refresh()}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </DndContext>
        )}
        {pairExercise.isError && (
          <Text variant="caption" tone="destructive">
            {pairExercise.error.message}
          </Text>
        )}
      </Card>

      <AddPlanExerciseCard planId={plan.id} onAdded={() => router.refresh()} />
    </Stack>
  );
}
