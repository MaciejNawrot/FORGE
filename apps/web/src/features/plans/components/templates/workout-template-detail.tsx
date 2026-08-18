'use client';

import type { WorkoutPlanWithExercises } from '@acme/contracts';
import { Button, Card, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { Dumbbell, ListOrdered, Play, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient, unwrapResult } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { trainingTypeStyles } from '@/utils';

interface WorkoutTemplateDetailProps {
  readonly template: WorkoutPlanWithExercises;
}

export function WorkoutTemplateDetail({ template }: WorkoutTemplateDetailProps) {
  const router = useRouter();
  const { dict } = useLocale();
  const category = template.category;
  const style = category ? trainingTypeStyles[category] : null;
  const totalSets = template.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  const fork = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.forkPlan({ params: { id: template.id } });
      return unwrapResult(result, 201);
    },
    onSuccess: (plan) => router.push(`/plans/${plan.id}`),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <section className="glass-panel relative overflow-hidden rounded-3xl p-8">
        <div className="from-primary/20 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="font-data flex flex-wrap gap-2 text-xs uppercase">
            {style && category && (
              <span className={`rounded-full px-3 py-1 ${style.badge}`}>
                {dict.trainingType[category]}
              </span>
            )}
            <span className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-3 py-1">
              <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
              {dict.common.exerciseCount(template.exercises.length)}
            </span>
            <span className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-3 py-1">
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              {dict.common.setCount(totalSets)}
            </span>
          </div>
          <Text
            variant="heading"
            className="font-display text-primary text-4xl uppercase md:text-5xl"
          >
            {template.name}
          </Text>
          {template.notes && (
            <Text tone="muted" className="max-w-xl">
              {template.notes}
            </Text>
          )}
          <Button
            onClick={() => fork.mutate()}
            disabled={fork.isPending}
            className="glow-primary flex w-full items-center justify-center gap-2 self-start py-4 text-base uppercase md:w-auto"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {fork.isPending ? dict.templateDetail.starting : dict.templateDetail.startWorkout}
          </Button>
          {fork.isError && (
            <Text variant="caption" tone="destructive">
              {fork.error.message}
            </Text>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="border-border flex items-center justify-between border-b pb-4">
          <Text variant="heading" className="font-display text-2xl uppercase">
            {dict.templateDetail.theRoutine}
          </Text>
          <span className="font-data text-primary flex items-center gap-2 text-sm">
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
            {dict.templateDetail.exercisesCount(template.exercises.length)}
          </span>
        </div>

        {template.exercises.length === 0 ? (
          <Text tone="muted">{dict.templateDetail.empty}</Text>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {template.exercises.map((exercise) => (
              <Card
                key={exercise.id}
                className="glass-panel relative flex flex-col gap-2 overflow-hidden p-4"
              >
                <div className="bg-primary absolute top-0 left-0 h-full w-1" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Text className="font-display text-lg uppercase">{exercise.exercise.name}</Text>
                    <Text tone="muted" variant="caption" className="font-data mt-1">
                      {dict.templateDetail.setsReps(
                        exercise.sets,
                        exercise.reps,
                        exercise.weightKg,
                      )}
                    </Text>
                  </div>
                  <div className="bg-background border-border text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
                    <Dumbbell className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
