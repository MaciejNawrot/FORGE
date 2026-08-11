'use client';

import type {
  AddTrainingSessionExerciseInput,
  TrainingSessionWithExercises,
} from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmButton } from '@/components/confirm-button';
import { apiClient } from '@/lib/api-client';
import { trainingTypeStyles } from '@/lib/training-colors';

export function SessionDetail({ session }: { session: TrainingSessionWithExercises }) {
  const router = useRouter();
  const style = trainingTypeStyles[session.type];

  const removeSession = useMutation({
    mutationFn: async () => {
      const result = await apiClient.training.removeSession({ params: { id: session.id } });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: () => router.push('/tracker'),
  });

  return (
    <Stack gap="lg">
      <Stack direction="row" justify="between" align="center">
        <Stack gap="xs">
          <Text variant="heading">{session.date}</Text>
          <span className={`w-fit rounded-full px-2 py-0.5 text-xs ${style.badge}`}>
            {style.label}
          </span>
        </Stack>
        <ConfirmButton
          variant="ghost"
          size="sm"
          title="Delete this training?"
          description="This training session and its logged exercises will be permanently deleted."
          pending={removeSession.isPending}
          onConfirm={() => removeSession.mutate()}
        >
          Delete
        </ConfirmButton>
      </Stack>

      {session.notes && (
        <Card>
          <Text tone="muted">{session.notes}</Text>
        </Card>
      )}

      <Card>
        <Text variant="subheading" className="mb-3 block">
          Exercises
        </Text>
        {session.exercises.length === 0 ? (
          <Text tone="muted">No exercises logged yet — search below to add one.</Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Sets</TableHead>
                <TableHead>Reps</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.exercises.map((exercise) => (
                <SessionExerciseRow
                  key={exercise.id}
                  sessionId={session.id}
                  exercise={exercise}
                  onRemoved={() => router.refresh()}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AddSessionExerciseCard sessionId={session.id} onAdded={() => router.refresh()} />
    </Stack>
  );
}

function SessionExerciseRow({
  sessionId,
  exercise,
  onRemoved,
}: {
  sessionId: string;
  exercise: TrainingSessionWithExercises['exercises'][number];
  onRemoved: () => void;
}) {
  const removeExercise = useMutation({
    mutationFn: async () => {
      const result = await apiClient.training.removeSessionExercise({
        params: { sessionId, exerciseId: exercise.id },
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
        <ConfirmButton
          variant="ghost"
          size="sm"
          title="Remove this exercise?"
          description={`"${exercise.exercise.name}" will be removed from this training.`}
          pending={removeExercise.isPending}
          onConfirm={() => removeExercise.mutate()}
        >
          Remove
        </ConfirmButton>
      </TableCell>
    </TableRow>
  );
}

function AddSessionExerciseCard({
  sessionId,
  onAdded,
}: {
  sessionId: string;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');

  const { data: results } = useQuery({
    queryKey: ['exercises', search],
    queryFn: async () => {
      const result = await apiClient.exercises.listExercises({ query: { search } });
      return result.status === 200 ? result.body : [];
    },
    enabled: search.trim().length > 0 && !selected,
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick an exercise first');
      const input: AddTrainingSessionExerciseInput = {
        exerciseId: selected.id,
        sets,
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
    onSuccess: () => {
      setSelected(null);
      setSearch('');
      setSets(3);
      setReps(10);
      setWeightKg('');
      onAdded();
    },
  });

  return (
    <Card>
      <Text variant="subheading" className="mb-3 block">
        Add exercise
      </Text>
      <Stack gap="sm">
        {!selected ? (
          <>
            <Input
              placeholder="Search exercises…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {results && results.length > 0 && (
              <Stack gap="xs" className="border-border max-h-48 overflow-y-auto rounded-md border">
                {results.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => {
                      setSelected({ id: exercise.id, name: exercise.name });
                      setSearch('');
                    }}
                    className="hover:bg-accent flex flex-col items-start px-3 py-2 text-left"
                  >
                    <span className="text-sm font-medium">{exercise.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {exercise.muscleGroups.join(', ')}
                    </span>
                  </button>
                ))}
              </Stack>
            )}
            {search.trim().length > 0 && results && results.length === 0 && (
              <Text tone="muted" variant="caption">
                No exercises match "{search}".
              </Text>
            )}
          </>
        ) : (
          <Stack direction="row" gap="sm" align="end" className="flex-wrap">
            <Stack gap="xs">
              <Text variant="caption">Exercise</Text>
              <Stack direction="row" gap="xs" align="center">
                <Text variant="body">{selected.name}</Text>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Change
                </Button>
              </Stack>
            </Stack>
            <Stack gap="xs" className="w-20">
              <Text variant="caption">Sets</Text>
              <Input
                type="number"
                value={sets}
                onChange={(event) => setSets(Number(event.target.value))}
              />
            </Stack>
            <Stack gap="xs" className="w-20">
              <Text variant="caption">Reps</Text>
              <Input
                type="number"
                value={reps}
                onChange={(event) => setReps(Number(event.target.value))}
              />
            </Stack>
            <Stack gap="xs" className="w-24">
              <Text variant="caption">Weight (kg)</Text>
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
              {addExercise.isPending ? 'Adding…' : 'Add'}
            </Button>
          </Stack>
        )}
        {addExercise.isError && (
          <Text variant="caption" tone="destructive">
            {addExercise.error.message}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
