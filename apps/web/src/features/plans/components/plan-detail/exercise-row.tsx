import type { WorkoutExercise } from '@acme/contracts';
import { Button, Stack, Text } from '@acme/ui';
import { TableCell, TableRow } from '@acme/ui/web';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useMutation } from '@tanstack/react-query';
import { Link2, Link2Off } from 'lucide-react';
import { apiClient, unwrapResult } from '@/shared/api';
import { ConfirmButton, PairPicker } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';

export function ExerciseRow({
  planId,
  exercise,
  pairedExerciseName,
  pairableExercises,
  onEdit,
  onRemoved,
  onPair,
  onChanged,
}: {
  planId: string;
  exercise: WorkoutExercise;
  pairedExerciseName: string | null;
  pairableExercises: WorkoutExercise[];
  onEdit: () => void;
  onRemoved: () => void;
  onPair: (pairWithExerciseId: string) => void;
  onChanged: () => void;
}) {
  const { dict } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: exercise.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: exercise.id,
    disabled: pairedExerciseName !== null,
  });

  const removeExercise = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removeExercise({
        params: { planId, exerciseId: exercise.id },
      });
      unwrapResult(result, 204);
    },
    onSuccess: onRemoved,
  });

  const unpairExercise = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.unpairExercise({
        params: { planId, exerciseId: exercise.id },
      });
      return unwrapResult(result, 200);
    },
    onSuccess: onChanged,
  });

  return (
    <TableRow
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      {...attributes}
      {...listeners}
      className={[
        pairedExerciseName ? 'border-primary/40 border-l-2' : '',
        isOver ? 'bg-accent' : '',
        isDragging ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <TableCell>
        <Text>{exercise.exercise.name}</Text>
        {pairedExerciseName && (
          <Text tone="muted" variant="caption" className="font-data block uppercase">
            {dict.planDetail.pairedWith(pairedExerciseName)}
          </Text>
        )}
      </TableCell>
      <TableCell>{exercise.sets}</TableCell>
      <TableCell>{exercise.reps}</TableCell>
      <TableCell>{exercise.weightKg ?? '—'}</TableCell>
      <TableCell>
        <Stack direction="row" gap="xs">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {dict.common.edit}
          </Button>
          {pairedExerciseName ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={unpairExercise.isPending}
              onClick={() => unpairExercise.mutate()}
              aria-label={dict.planDetail.unpair}
            >
              <Link2Off className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <PairPicker
              variant="ghost"
              size="sm"
              title={dict.planDetail.pairPickerTitle}
              emptyLabel={dict.planDetail.noPairableExercises}
              items={pairableExercises.map((e) => ({ id: e.id, name: e.exercise.name }))}
              onPick={onPair}
              aria-label={dict.planDetail.pair}
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </PairPicker>
          )}
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
        {(removeExercise.isError || unpairExercise.isError) && (
          <Text variant="caption" tone="destructive">
            {(removeExercise.error ?? unpairExercise.error)?.message}
          </Text>
        )}
      </TableCell>
    </TableRow>
  );
}
