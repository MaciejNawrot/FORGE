import type { WorkoutExercise } from '@acme/contracts';
import { Button, Stack } from '@acme/ui';
import { TableCell, TableRow } from '@acme/ui/web';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { ConfirmButton } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';

export function ExerciseRow({
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
