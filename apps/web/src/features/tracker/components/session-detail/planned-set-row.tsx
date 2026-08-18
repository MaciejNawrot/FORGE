import { Text } from '@acme/ui';
import { useState } from 'react';
import { useLocale } from '@/shared/i18n/context';
import { CompactNumberInput } from './number-inputs';
import { useLogSet } from './use-log-set';

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

  const logSet = useLogSet(sessionId, exerciseId, onLogged);

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
          onChange={() => logSet.mutate({ reps, weightKg })}
          aria-label={dict.activeTracking.logSet}
          className="border-border bg-background checked:bg-primary checked:border-primary h-5 w-5 shrink-0 appearance-none rounded border bg-center bg-no-repeat checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2016%2016%27%20fill=%27none%27%20stroke=%27black%27%20stroke-width=%272.5%27%3E%3Cpath%20d=%27M3%208.5l3%203%207-7%27/%3E%3C/svg%3E')]"
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
