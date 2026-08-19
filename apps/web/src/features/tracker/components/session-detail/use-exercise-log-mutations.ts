import type { TrainingSessionExercise } from '@acme/contracts';
import { useMutation } from '@tanstack/react-query';
import { apiClient, unwrapResult } from '@/shared/api';

export function useExerciseLogMutations(
  sessionId: string,
  loggedExercise: TrainingSessionExercise | null,
  onChanged: () => void,
) {
  const updateNotes = useMutation({
    mutationFn: async (notes: string | null) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.updateSessionExerciseNotes({
        params: { sessionId, exerciseId: loggedExercise.id },
        body: { notes },
      });
      return unwrapResult(result, 200);
    },
    onSuccess: onChanged,
  });

  const updateRest = useMutation({
    mutationFn: async (value: number) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.updateSessionExerciseRest({
        params: { sessionId, exerciseId: loggedExercise.id },
        body: { restSeconds: value },
      });
      return unwrapResult(result, 200);
    },
    onSuccess: onChanged,
  });

  const updateSet = useMutation({
    mutationFn: async ({
      setId,
      reps,
      weightKg,
    }: {
      setId: string;
      reps: number;
      weightKg: number | null;
    }) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.updateSessionSet({
        params: { sessionId, exerciseId: loggedExercise.id, setId },
        body: { reps, weightKg },
      });
      return unwrapResult(result, 200);
    },
    onSuccess: onChanged,
  });

  const removeSet = useMutation({
    mutationFn: async (setId: string) => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.removeSessionSet({
        params: { sessionId, exerciseId: loggedExercise.id, setId },
      });
      unwrapResult(result, 204);
    },
    onSuccess: onChanged,
  });

  const removeExercise = useMutation({
    mutationFn: async () => {
      if (!loggedExercise) throw new Error('No logged exercise yet');
      const result = await apiClient.training.removeSessionExercise({
        params: { sessionId, exerciseId: loggedExercise.id },
      });
      unwrapResult(result, 204);
    },
    onSuccess: onChanged,
  });

  return { updateNotes, updateRest, updateSet, removeSet, removeExercise };
}
