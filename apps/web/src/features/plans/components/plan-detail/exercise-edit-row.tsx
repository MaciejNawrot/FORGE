import type { UpdateWorkoutExerciseInput, WorkoutExercise } from '@acme/contracts';
import { Button, Input, Text } from '@acme/ui';
import { TableCell, TableRow } from '@acme/ui/web';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';

export function ExerciseEditRow({
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
