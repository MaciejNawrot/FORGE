'use client';

import type {
  Exercise,
  UpdateWorkoutExerciseInput,
  WorkoutExercise,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
import { updateWorkoutPlanInputSchema } from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ConfirmButton } from '@/components/confirm-button';
import { ExercisePicker } from '@/components/exercise-picker';
import { useLocale } from '@/lib/i18n/context';
import { apiClient } from '@/shared/api';

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

function AddPlanExerciseCard({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const { dict } = useLocale();
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');

  const addExercise = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick an exercise first');
      const result = await apiClient.workouts.addExercise({
        params: { planId },
        body: {
          exerciseId: selected.id,
          sets,
          reps,
          weightKg: weightKg === '' ? undefined : Number(weightKg),
        },
      });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => {
      setSelected(null);
      setSets(3);
      setReps(10);
      setWeightKg('');
      onAdded();
    },
  });

  return (
    <Card>
      <Text variant="subheading" className="mb-3 block">
        {dict.planDetail.addExercise}
      </Text>
      {selected ? (
        <Stack gap="sm">
          <div className="flex items-center justify-between gap-2">
            <Text className="font-medium">{selected.name}</Text>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-data text-muted-foreground hover:text-primary text-xs uppercase"
            >
              {dict.common.change}
            </button>
          </div>
          <Stack direction="row" gap="sm" align="end" className="flex-wrap">
            <Stack gap="xs" className="w-20">
              <Text variant="caption">{dict.common.sets}</Text>
              <Input
                type="number"
                value={sets}
                onChange={(event) => setSets(Number(event.target.value))}
              />
            </Stack>
            <Stack gap="xs" className="w-20">
              <Text variant="caption">{dict.common.reps}</Text>
              <Input
                type="number"
                value={reps}
                onChange={(event) => setReps(Number(event.target.value))}
              />
            </Stack>
            <Stack gap="xs" className="w-24">
              <Text variant="caption">{dict.common.weightKg}</Text>
              <Input
                type="number"
                step="0.5"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
              />
            </Stack>
            <Button
              type="button"
              disabled={addExercise.isPending}
              onClick={() => addExercise.mutate()}
            >
              {addExercise.isPending ? dict.common.adding : dict.common.add}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <ExercisePicker onSelect={setSelected} />
      )}
      {addExercise.isError && (
        <Text variant="caption" tone="destructive" className="mt-2 block">
          {addExercise.error.message}
        </Text>
      )}
    </Card>
  );
}

function ExerciseRow({
  planId,
  exercise,
  onEdit,
  onRemoved,
}: {
  planId: string;
  exercise: WorkoutExercise;
  onEdit: () => void;
  onRemoved: () => void;
}) {
  const { dict } = useLocale();
  const removeExercise = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removeExercise({
        params: { planId, exerciseId: exercise.id },
      });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: onRemoved,
  });

  return (
    <TableRow>
      <TableCell>{exercise.exercise.name}</TableCell>
      <TableCell>{exercise.sets}</TableCell>
      <TableCell>{exercise.reps}</TableCell>
      <TableCell>{exercise.weightKg ?? '—'}</TableCell>
      <TableCell>
        <Stack direction="row" gap="xs">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {dict.common.edit}
          </Button>
          <ConfirmButton
            variant="ghost"
            size="sm"
            title={dict.planDetail.removeExerciseTitle}
            description={dict.planDetail.removeExerciseDescription(exercise.exercise.name)}
            pending={removeExercise.isPending}
            onConfirm={() => removeExercise.mutate()}
          >
            {dict.common.remove}
          </ConfirmButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function ExerciseEditRow({
  planId,
  exercise,
  onDone,
  onCancel,
}: {
  planId: string;
  exercise: WorkoutExercise;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { dict } = useLocale();
  const { register, handleSubmit } = useForm<UpdateWorkoutExerciseInput>({
    defaultValues: {
      sets: exercise.sets,
      reps: exercise.reps,
      weightKg: exercise.weightKg,
    },
  });

  const updateExercise = useMutation({
    mutationFn: async (values: UpdateWorkoutExerciseInput) => {
      const result = await apiClient.workouts.updateExercise({
        params: { planId, exerciseId: exercise.id },
        body: values,
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: onDone,
  });

  return (
    <TableRow>
      <TableCell colSpan={5}>
        <form
          onSubmit={handleSubmit((values) => updateExercise.mutate(values))}
          className="flex flex-wrap items-center gap-2"
        >
          <Text className="font-medium">{exercise.exercise.name}</Text>
          <Input className="w-16" type="number" {...register('sets', { valueAsNumber: true })} />
          <Input className="w-16" type="number" {...register('reps', { valueAsNumber: true })} />
          <Input
            className="w-20"
            type="number"
            step="0.5"
            {...register('weightKg', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
          <Button type="submit" size="sm" disabled={updateExercise.isPending}>
            {dict.common.save}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {dict.common.cancel}
          </Button>
        </form>
        {updateExercise.isError && (
          <Text variant="caption" tone="destructive" className="mt-1 block">
            {updateExercise.error.message}
          </Text>
        )}
      </TableCell>
    </TableRow>
  );
}
