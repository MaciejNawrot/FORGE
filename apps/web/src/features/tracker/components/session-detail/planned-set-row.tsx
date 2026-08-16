import type { AddTrainingSessionExerciseInput } from '@acme/contracts';
import { Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import { CompactNumberInput } from './number-inputs';

export function PlannedSetRow({
  sessionId,
  exerciseId,
  index,
  prefillReps,
  prefillWeightKg,
  onLogged,
}: {
  sessionId: string;
  exerciseId: string;
  index: number;
  prefillReps: number;
  prefillWeightKg: string;
  onLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
}) {
  const { dict } = useLocale();
  const [reps, setReps] = useState(prefillReps);
  const [weightKg, setWeightKg] = useState(prefillWeightKg);

  const logSet = useMutation({
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
    <div className="bg-muted/50 border-border flex flex-col gap-1 rounded-lg border border-dashed p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="bg-accent font-data text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">
          {index}
        </div>
        <div className="font-data flex flex-1 items-center gap-2 text-sm">
          <CompactNumberInput value={reps} onChange={(v) => setReps(Number(v))} />
          <span className="text-muted-foreground">×</span>
          <CompactNumberInput value={weightKg} onChange={setWeightKg} step="0.5" suffix="kg" />
        </div>
        <input
          type="checkbox"
          disabled={logSet.isPending}
          onChange={() => logSet.mutate()}
          aria-label={dict.activeTracking.logSet}
          className="accent-primary h-5 w-5 shrink-0"
        />
      </div>
      {logSet.isError && (
        <Text variant="caption" tone="destructive">
          {logSet.error.message}
        </Text>
      )}
    </div>
  );
}
