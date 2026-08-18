import type {
  AddTrainingSessionExerciseInput,
  Exercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient, unwrapResult } from '@/shared/api';
import { ExercisePicker } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';
import { alreadyTrainedGroups } from '../../lib/muscle-fatigue';
import { BigNumberInput } from './number-inputs';

export function AddSessionExerciseCard({
  sessionId,
  loggedExercises,
  onSetLogged,
}: {
  sessionId: string;
  loggedExercises: TrainingSessionWithExercises['exercises'];
  onSetLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
}) {
  const { dict } = useLocale();
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');

  const { data: lastPerformance } = useQuery({
    queryKey: ['last-performance', selected?.id],
    queryFn: async () => {
      if (!selected) return null;
      const result = await apiClient.training.lastPerformance({
        query: { exerciseIds: selected.id },
      });
      return result.status === 200 ? (result.body[0] ?? null) : null;
    },
    enabled: selected !== null,
  });

  const alreadyTrained = selected
    ? alreadyTrainedGroups(selected.muscleGroups, loggedExercises)
    : [];

  const addSet = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick an exercise first');
      const input: AddTrainingSessionExerciseInput = {
        exerciseId: selected.id,
        reps,
        weightKg: weightKg === '' ? undefined : Number(weightKg),
      };
      const result = await apiClient.training.addSessionExercise({
        params: { sessionId },
        body: input,
      });
      return unwrapResult(result, 201);
    },
    onSuccess: (group) => {
      const priorRestSeconds = lastPerformance?.restSeconds ?? null;
      setSelected(null);
      setReps(10);
      setWeightKg('');
      onSetLogged({ id: group.id, restSeconds: group.restSeconds ?? priorRestSeconds });
    },
  });

  return (
    <Card className="glass-panel flex flex-col gap-4">
      {selected && (
        <div className="flex items-start justify-between gap-2">
          <div>
            <Text
              variant="subheading"
              className="font-display text-primary block text-xl uppercase"
            >
              {selected.name}
            </Text>
            {lastPerformance && (
              <Text tone="muted" variant="caption" className="font-data block">
                {dict.activeTracking.lastTime(
                  lastPerformance.weightKg,
                  lastPerformance.reps,
                  lastPerformance.date,
                )}
              </Text>
            )}
            {alreadyTrained.length > 0 && (
              <Text tone="muted" variant="caption" className="font-data mt-1 block uppercase">
                {dict.activeTracking.alreadyTrained(alreadyTrained.join(', '))}
              </Text>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="font-data text-muted-foreground hover:text-primary text-xs uppercase"
          >
            {dict.common.change}
          </button>
        </div>
      )}
      {!selected ? (
        <ExercisePicker onSelect={setSelected} />
      ) : (
        <Stack gap="sm">
          <div className="grid grid-cols-2 gap-3">
            <BigNumberInput
              label={dict.common.reps}
              value={reps}
              onChange={(v) => setReps(Number(v))}
            />
            <BigNumberInput
              label={dict.common.weightKg}
              value={weightKg}
              step="0.5"
              onChange={setWeightKg}
            />
          </div>
          <button
            type="button"
            disabled={addSet.isPending}
            onClick={() => addSet.mutate()}
            className="bg-primary text-primary-foreground font-display w-full rounded-lg py-4 uppercase tracking-wider transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {addSet.isPending ? dict.common.logging : dict.activeTracking.logSet}
          </button>
        </Stack>
      )}
      {addSet.isError && (
        <Text variant="caption" tone="destructive">
          {addSet.error.message}
        </Text>
      )}
    </Card>
  );
}
