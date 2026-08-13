'use client';

import type {
  AddTrainingSessionExerciseInput,
  Exercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flag, Timer, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmButton } from '@/components/confirm-button';
import { ExercisePicker } from '@/components/exercise-picker';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';
import { alreadyTrainedGroups } from '@/lib/muscle-fatigue';
import { trainingTypeStyles } from '@/lib/training-colors';

const REST_SECONDS = 90;

function useElapsedTime(since: Date | string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Crossing the Server -> Client Component boundary serializes `Date` props
  // to plain ISO strings, so this can't assume `since` is still a `Date`.
  const sinceMs = since instanceof Date ? since.getTime() : new Date(since).getTime();
  const elapsed = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function useCountdown(
  active: boolean,
  seconds: number,
): { remaining: number; setRemaining: (value: number) => void; display: string; done: boolean } {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [active, seconds]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return {
    remaining,
    setRemaining,
    display: `${minutes}:${String(secs).padStart(2, '0')}`,
    done: remaining === 0,
  };
}

export function SessionDetail({ session }: { session: TrainingSessionWithExercises }) {
  const router = useRouter();
  const { dict } = useLocale();
  const style = trainingTypeStyles[session.type];
  const duration = useElapsedTime(session.createdAt);
  const [resting, setResting] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const rest = useCountdown(resting, REST_SECONDS);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');

  const removeSession = useMutation({
    mutationFn: async () => {
      const result = await apiClient.training.removeSession({ params: { id: session.id } });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: () => router.push('/tracker'),
  });

  return (
    <Stack gap="lg" className="pb-24">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
          {dict.activeTracking.duration}
        </Text>
        <span className="font-display text-glow-primary text-primary text-6xl tabular-nums">
          {duration}
        </span>
        <div className="flex items-center gap-2">
          <span className={`font-data rounded-full px-2 py-0.5 text-xs uppercase ${style.badge}`}>
            {dict.trainingType[session.type]} · {session.date}
          </span>
          <ConfirmButton
            variant="ghost"
            size="sm"
            title={dict.sessionDetail.deleteTitle}
            description={dict.sessionDetail.deleteDescription}
            pending={removeSession.isPending}
            onConfirm={() => removeSession.mutate()}
            className="text-destructive h-7 w-7 p-0"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dict.sessionDetail.deleteWorkoutSr}</span>
          </ConfirmButton>
        </div>
      </div>

      {session.notes && (
        <Card className="glass-panel">
          <Text tone="muted">{session.notes}</Text>
        </Card>
      )}

      <AddSessionExerciseCard
        sessionId={session.id}
        loggedExercises={session.exercises}
        selected={selected}
        onSelect={setSelected}
        sets={sets}
        onSetsChange={setSets}
        reps={reps}
        onRepsChange={setReps}
        weightKg={weightKg}
        onWeightKgChange={setWeightKg}
        onAdded={() => {
          setResting(true);
          router.refresh();
        }}
      />

      <Card className="glass-panel">
        <Text
          tone="muted"
          variant="caption"
          className="font-data mb-3 block tracking-widest uppercase"
        >
          {dict.activeTracking.previousSets}
        </Text>
        {session.exercises.length === 0 ? (
          <Text tone="muted">{dict.sessionDetail.noSets}</Text>
        ) : (
          <Stack gap="sm">
            {session.exercises.map((exercise, index) => (
              <SessionExerciseRow
                key={exercise.id}
                index={index + 1}
                sessionId={session.id}
                exercise={exercise}
                onRemoved={() => router.refresh()}
              />
            ))}
          </Stack>
        )}
      </Card>

      <div className="glass-panel fixed inset-x-4 bottom-[76px] z-40 flex items-center justify-between gap-3 rounded-full p-2 md:right-6 md:bottom-24 md:left-auto md:w-auto">
        {resting ? (
          <div className="bg-muted flex items-center gap-3 rounded-full px-4 py-2">
            <Timer className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <Text tone="muted" variant="caption" className="font-data uppercase">
              {dict.activeTracking.resting}
            </Text>
            {editingRest ? (
              <input
                type="number"
                min={0}
                // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
                autoFocus
                defaultValue={rest.remaining}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  rest.setRemaining(Number.isFinite(value) ? Math.max(0, value) : rest.remaining);
                  setEditingRest(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="font-display text-primary w-14 bg-transparent text-xl tabular-nums outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingRest(true)}
                className={`font-display text-xl tabular-nums ${rest.done ? 'text-destructive' : 'text-primary'}`}
              >
                {rest.display}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setResting(false);
                setEditingRest(false);
              }}
              className="bg-accent hover:text-primary flex h-7 w-7 items-center justify-center rounded-full transition-colors"
              aria-label="Skip rest"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <span />
        )}
        <ConfirmButton
          variant="outline"
          title={dict.sessionDetail.finishTitle}
          description={dict.sessionDetail.finishDescription}
          confirmLabel={dict.common.finish}
          onConfirm={() => router.push('/tracker')}
          className="border-primary text-primary font-display shrink-0 gap-2 rounded-full uppercase"
        >
          <Flag className="h-4 w-4" fill="currentColor" aria-hidden="true" />
          {dict.common.finish}
        </ConfirmButton>
      </div>
    </Stack>
  );
}

function SessionExerciseRow({
  index,
  sessionId,
  exercise,
  onRemoved,
}: {
  index: number;
  sessionId: string;
  exercise: TrainingSessionWithExercises['exercises'][number];
  onRemoved: () => void;
}) {
  const { dict } = useLocale();
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
    <div className="bg-muted flex items-center justify-between gap-3 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div className="bg-accent font-data flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm">
          {index}
        </div>
        <div className="flex flex-col">
          <Text className="font-medium">{exercise.exercise.name}</Text>
          <Text tone="muted" variant="caption" className="font-data">
            {dict.sessionDetail.exerciseLine(exercise.weightKg, exercise.reps, exercise.sets)}
          </Text>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="text-primary h-5 w-5" aria-hidden="true" />
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={dict.planDetail.removeExerciseTitle}
          description={dict.sessionDetail.removeExerciseDescription(exercise.exercise.name)}
          pending={removeExercise.isPending}
          onConfirm={() => removeExercise.mutate()}
        >
          {dict.common.remove}
        </ConfirmButton>
      </div>
    </div>
  );
}

function BigNumberInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <div className="bg-muted focus-within:border-primary border-border rounded-lg border p-4 transition-colors">
      <Text tone="muted" variant="caption" className="font-data mb-2 block uppercase">
        {label}
      </Text>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-display text-primary w-full bg-transparent text-4xl outline-none"
      />
    </div>
  );
}

function AddSessionExerciseCard({
  sessionId,
  loggedExercises,
  selected,
  onSelect,
  sets,
  onSetsChange,
  reps,
  onRepsChange,
  weightKg,
  onWeightKgChange,
  onAdded,
}: {
  sessionId: string;
  loggedExercises: TrainingSessionWithExercises['exercises'];
  selected: Exercise | null;
  onSelect: (exercise: Exercise | null) => void;
  sets: number;
  onSetsChange: (value: number) => void;
  reps: number;
  onRepsChange: (value: number) => void;
  weightKg: string;
  onWeightKgChange: (value: string) => void;
  onAdded: () => void;
}) {
  const { dict } = useLocale();

  const { data: lastPerformance } = useQuery({
    queryKey: ['last-performance', selected?.id],
    queryFn: async () => {
      if (!selected) return undefined;
      const result = await apiClient.training.lastPerformance({
        query: { exerciseIds: selected.id },
      });
      return result.status === 200 ? result.body[0] : undefined;
    },
    enabled: selected !== null,
  });

  const alreadyTrained = selected
    ? alreadyTrainedGroups(selected.muscleGroups, loggedExercises)
    : [];

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
      onSelect(null);
      onSetsChange(3);
      onRepsChange(10);
      onWeightKgChange('');
      onAdded();
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
                  lastPerformance.sets,
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
            onClick={() => onSelect(null)}
            className="font-data text-muted-foreground hover:text-primary text-xs uppercase"
          >
            {dict.common.change}
          </button>
        </div>
      )}
      {!selected ? (
        <ExercisePicker onSelect={onSelect} />
      ) : (
        <Stack gap="sm">
          <div className="grid grid-cols-3 gap-3">
            <BigNumberInput
              label={dict.common.sets}
              value={sets}
              onChange={(v) => onSetsChange(Number(v))}
            />
            <BigNumberInput
              label={dict.common.reps}
              value={reps}
              onChange={(v) => onRepsChange(Number(v))}
            />
            <BigNumberInput
              label={dict.common.weightKg}
              value={weightKg}
              step="0.5"
              onChange={onWeightKgChange}
            />
          </div>
          <button
            type="button"
            disabled={addExercise.isPending}
            onClick={() => addExercise.mutate()}
            className="bg-primary text-primary-foreground font-display w-full rounded-lg py-4 uppercase tracking-wider transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {addExercise.isPending ? dict.common.logging : dict.activeTracking.logSet}
          </button>
        </Stack>
      )}
      {addExercise.isError && (
        <Text variant="caption" tone="destructive">
          {addExercise.error.message}
        </Text>
      )}
    </Card>
  );
}
