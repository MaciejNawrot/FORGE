import type { AddTrainingSessionExerciseInput } from '@acme/contracts';
import { useMutation } from '@tanstack/react-query';
import { apiClient, unwrapResult } from '@/shared/api';

export function useLogSet(
  sessionId: string,
  exerciseId: string,
  onLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void,
) {
  return useMutation({
    mutationFn: async (input: { reps: number; weightKg: string }) => {
      const body: AddTrainingSessionExerciseInput = {
        exerciseId,
        reps: input.reps,
        weightKg: input.weightKg === '' ? undefined : Number(input.weightKg),
      };
      const result = await apiClient.training.addSessionExercise({
        params: { sessionId },
        body,
      });
      return unwrapResult(result, 201);
    },
    onSuccess: (group) => {
      onLogged({ id: group.id, restSeconds: group.restSeconds });
    },
  });
}
