'use client';

import type {
  UpdateWorkoutExerciseInput,
  WorkoutExercise,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
import { createWorkoutExerciseInputSchema, updateWorkoutPlanInputSchema } from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ConfirmButton } from '@/components/confirm-button';
import { apiClient } from '@/lib/api-client';
import { exerciseLibrary } from '@/lib/exercise-library';

const exerciseNameSuggestions = Object.values(exerciseLibrary).flatMap((exercises) =>
  exercises.map((exercise) => exercise.name),
);

type PlanFormValues = z.infer<typeof updateWorkoutPlanInputSchema>;
type ExerciseFormValues = z.infer<typeof createWorkoutExerciseInputSchema>;

export function PlanDetail({ plan }: { plan: WorkoutPlanWithExercises }) {
  const router = useRouter();
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

  const addExerciseForm = useForm<ExerciseFormValues>({
    resolver: zodResolver(createWorkoutExerciseInputSchema),
  });

  const addExercise = useMutation({
    mutationFn: async (values: ExerciseFormValues) => {
      const result = await apiClient.workouts.addExercise({
        params: { planId: plan.id },
        body: values,
      });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => {
      addExerciseForm.reset();
      router.refresh();
    },
  });

  return (
    <Stack gap="lg">
      <Stack direction="row" justify="between" align="center">
        <Text variant="heading">{plan.name}</Text>
        <ConfirmButton
          variant="ghost"
          size="sm"
          title="Delete this plan?"
          description={`"${plan.name}" and all of its exercises will be permanently deleted.`}
          pending={removePlan.isPending}
          onConfirm={() => removePlan.mutate()}
        >
          Delete plan
        </ConfirmButton>
      </Stack>

      <Card>
        <form onSubmit={planForm.handleSubmit((values) => updatePlan.mutate(values))}>
          <Stack gap="sm">
            <Stack gap="xs">
              <Text variant="caption">Name</Text>
              <Input {...planForm.register('name')} />
              {planForm.formState.errors.name && (
                <Text variant="caption" tone="destructive">
                  {planForm.formState.errors.name.message}
                </Text>
              )}
            </Stack>
            <Stack gap="xs">
              <Text variant="caption">Notes</Text>
              <textarea
                className="border-border bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none"
                rows={2}
                {...planForm.register('notes')}
              />
            </Stack>
            <Stack direction="row" gap="sm" align="center">
              <Button type="submit" size="sm" disabled={updatePlan.isPending}>
                {updatePlan.isPending ? 'Saving…' : 'Save'}
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
          Exercises
        </Text>
        {plan.exercises.length === 0 ? (
          <Text tone="muted">No exercises yet — add one below.</Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Sets</TableHead>
                <TableHead>Reps</TableHead>
                <TableHead>Weight (kg)</TableHead>
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

      <Card>
        <Text variant="subheading" className="mb-3 block">
          Add exercise
        </Text>
        <form onSubmit={addExerciseForm.handleSubmit((values) => addExercise.mutate(values))}>
          <Stack direction="row" gap="sm" align="end" className="flex-wrap">
            <Stack gap="xs">
              <Text variant="caption">Name</Text>
              <Input
                placeholder="Bench Press"
                list="exercise-name-suggestions"
                {...addExerciseForm.register('name')}
              />
            </Stack>
            <Stack gap="xs" className="w-20">
              <Text variant="caption">Sets</Text>
              <Input type="number" {...addExerciseForm.register('sets', { valueAsNumber: true })} />
            </Stack>
            <Stack gap="xs" className="w-20">
              <Text variant="caption">Reps</Text>
              <Input type="number" {...addExerciseForm.register('reps', { valueAsNumber: true })} />
            </Stack>
            <Stack gap="xs" className="w-24">
              <Text variant="caption">Weight (kg)</Text>
              <Input
                type="number"
                step="0.5"
                {...addExerciseForm.register('weightKg', {
                  setValueAs: (v) => (v === '' ? undefined : Number(v)),
                })}
              />
            </Stack>
            <Button type="submit" disabled={addExercise.isPending}>
              {addExercise.isPending ? 'Adding…' : 'Add'}
            </Button>
          </Stack>
          {addExercise.isError && (
            <Text variant="caption" tone="destructive" className="mt-2 block">
              {addExercise.error.message}
            </Text>
          )}
        </form>
        <datalist id="exercise-name-suggestions">
          {exerciseNameSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Card>
    </Stack>
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
      <TableCell>{exercise.name}</TableCell>
      <TableCell>{exercise.sets}</TableCell>
      <TableCell>{exercise.reps}</TableCell>
      <TableCell>{exercise.weightKg ?? '—'}</TableCell>
      <TableCell>
        <Stack direction="row" gap="xs">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <ConfirmButton
            variant="ghost"
            size="sm"
            title="Remove this exercise?"
            description={`"${exercise.name}" will be removed from this plan.`}
            pending={removeExercise.isPending}
            onConfirm={() => removeExercise.mutate()}
          >
            Remove
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
  const { register, handleSubmit } = useForm<UpdateWorkoutExerciseInput>({
    defaultValues: {
      name: exercise.name,
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
          className="flex flex-wrap items-end gap-2"
        >
          <Input className="w-32" required {...register('name')} />
          <Input className="w-16" type="number" {...register('sets', { valueAsNumber: true })} />
          <Input className="w-16" type="number" {...register('reps', { valueAsNumber: true })} />
          <Input
            className="w-20"
            type="number"
            step="0.5"
            {...register('weightKg', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
          <Button type="submit" size="sm" disabled={updateExercise.isPending}>
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
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
