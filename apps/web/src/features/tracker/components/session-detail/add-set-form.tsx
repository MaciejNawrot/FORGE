import type { AddTrainingSessionExerciseInput } from '@acme/contracts';
import { Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { CompactNumberInput } from './number-inputs';

export function AddSetForm({
  sessionId,
  exerciseId,
  lastReps,
  lastWeightKg,
  onLogged,
}: {
  sessionId: string;
  exerciseId: string;
  lastReps: number;
  lastWeightKg: number | null;
  onLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
}) {
  const { dict } = useLocale();
  const [reps, setReps] = useState(lastReps);
  const [weightKg, setWeightKg] = useState(lastWeightKg == null ? '' : String(lastWeightKg));

  const addSet = useMutation({
    mutationFn: async () => {
      const input: AddTrainingSessionExerciseInput = {
        exerciseId,
        reps,
        weightKg: weightKg === '' ? undefined : Number(weightKg),
      };
      const result = await apiClient.training.addSessionExercise({
        params: { sessionId },
        body: input,
      });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: (group) => {
      onLogged({ id: group.id, restSeconds: group.restSeconds });
    },
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <CompactNumberInput value={reps} onChange={(v) => setReps(Number(v))} />
        <span className="text-muted-foreground font-data text-sm">×</span>
        <CompactNumberInput value={weightKg} onChange={setWeightKg} step="0.5" suffix="kg" />
        <button
          type="button"
          disabled={addSet.isPending}
          onClick={() => addSet.mutate()}
          className="bg-primary text-primary-foreground font-data shrink-0 rounded-lg px-3 py-2 text-xs uppercase disabled:opacity-50"
        >
          {addSet.isPending ? dict.common.logging : dict.activeTracking.logSet}
        </button>
      </div>
      {addSet.isError && (
        <Text variant="caption" tone="destructive">
          {addSet.error.message}
        </Text>
      )}
    </div>
  );
}
