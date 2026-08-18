import { Text } from '@acme/ui';
import { useState } from 'react';
import { useLocale } from '@/shared/i18n/context';
import { CompactNumberInput } from './number-inputs';
import { useLogSet } from './use-log-set';

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

  const addSet = useLogSet(sessionId, exerciseId, onLogged);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <CompactNumberInput value={reps} onChange={(v) => setReps(Number(v))} />
        <span className="text-muted-foreground font-data text-sm">×</span>
        <CompactNumberInput value={weightKg} onChange={setWeightKg} step="0.5" suffix="kg" />
        <button
          type="button"
          disabled={addSet.isPending}
          onClick={() => addSet.mutate({ reps, weightKg })}
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
