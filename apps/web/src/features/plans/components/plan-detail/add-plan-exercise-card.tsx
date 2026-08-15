import type { Exercise } from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { ExercisePicker } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';

export function AddPlanExerciseCard({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const { dict } = useLocale();
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');

  const addExercise = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick an exercise first');
      const result = await apiClient.workouts.addExercise({
        params: { planId },
        body: {
          exerciseId: selected.id,
          sets,
          reps,
          weightKg: weightKg === '' ? undefined : Number(weightKg),
        },
      });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => {
      setSelected(null);
      setSets(3);
      setReps(10);
      setWeightKg('');
      onAdded();
    },
  });

  return (
    <Card className="glass-panel">
      <Text variant="subheading" className="font-display mb-3 block text-xl uppercase">
        {dict.planDetail.addExercise}
      </Text>
      {selected ? (
        <Stack gap="sm">
          <div className="flex items-center justify-between gap-2">
            <Text className="font-medium">{selected.name}</Text>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-data text-muted-foreground hover:text-primary text-xs uppercase"
            >
              {dict.common.change}
            </button>
          </div>
          <Stack direction="row" gap="sm" align="end" className="flex-wrap">
            <Stack gap="xs" className="w-20">
              <Text variant="caption">{dict.common.sets}</Text>
              <Input
                type="number"
                value={sets}
                onChange={(event) => setSets(Number(event.target.value))}
              />
            </Stack>
            <Stack gap="xs" className="w-20">
              <Text variant="caption">{dict.common.reps}</Text>
              <Input
                type="number"
                value={reps}
                onChange={(event) => setReps(Number(event.target.value))}
              />
            </Stack>
            <Stack gap="xs" className="w-24">
              <Text variant="caption">{dict.common.weightKg}</Text>
              <Input
                type="number"
                step="0.5"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
              />
            </Stack>
            <Button
              type="button"
              disabled={addExercise.isPending}
              onClick={() => addExercise.mutate()}
            >
              {addExercise.isPending ? dict.common.adding : dict.common.add}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <ExercisePicker onSelect={setSelected} />
      )}
      {addExercise.isError && (
        <Text variant="caption" tone="destructive" className="mt-2 block">
          {addExercise.error.message}
        </Text>
      )}
    </Card>
  );
}
