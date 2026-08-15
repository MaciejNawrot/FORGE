'use client';

import type {
  AddTrainingSessionExerciseInput,
  Exercise,
  TrainingSessionWithExercises,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmButton } from '@/components/confirm-button';
import { ExercisePicker } from '@/components/exercise-picker';
import { useActiveSession, useActiveSessionStore } from '@/lib/active-session-store';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';
import { alreadyTrainedGroups } from '@/lib/muscle-fatigue';
import { prefillFrom, unloggedPlanExercises } from '@/lib/plan-progress';
import { trainingTypeStyles } from '@/lib/training-colors';

const REST_SECONDS = 90;

function useElapsedTime(since: number | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since == null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [since]);

  if (since == null) return '0:00';

  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
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
    // `seconds` seeds `remaining` only when a rest period starts (active
    // flips false -> true). It's deliberately left out of the dependency
    // array: a caller changing the target duration mid-rest (+15s, manual
    // edit) must not restart the tick and wipe elapsed progress — callers
    // use the returned `setRemaining` directly for that instead.
  }, [active]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return {
    remaining,
    setRemaining,
    display: `${minutes}:${String(secs).padStart(2, '0')}`,
    done: remaining === 0,
  };
}

export function SessionDetail({
  session,
  plan,
}: {
  session: TrainingSessionWithExercises;
  plan?: WorkoutPlanWithExercises | null;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const style = trainingTypeStyles[session.type];
  const activeSession = useActiveSession();
  const isThisSessionActive = activeSession !== null && activeSession.sessionId === session.id;
  const completedDuration = isThisSessionActive ? null : session.durationSeconds;
  const duration = useElapsedTime(
    activeSession && isThisSessionActive ? activeSession.startedAt : null,
  );
  const start = useActiveSessionStore((state) => state.start);
  const end = useActiveSessionStore((state) => state.end);
  const [blocked, setBlocked] = useState(false);

  const handleStart = () => {
    if (activeSession && activeSession.sessionId !== session.id) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    start(session.id);
  };

  const finishSession = useMutation({
    mutationFn: async (durationSeconds: number) => {
      const result = await apiClient.training.finishSession({
        params: { id: session.id },
        body: { durationSeconds },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => {
      end();
      router.push('/tracker');
    },
  });

  const handleFinish = () => {
    if (!activeSession) return;
    const durationSeconds = Math.max(0, Math.floor((Date.now() - activeSession.startedAt) / 1000));
    finishSession.mutate(durationSeconds);
  };

  const [resting, setResting] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [restSeconds, setRestSeconds] = useState(REST_SECONDS);
  const [restExerciseLogId, setRestExerciseLogId] = useState<string | null>(null);
  const rest = useCountdown(resting, restSeconds);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');

  const notYetLogged = plan ? unloggedPlanExercises(plan.exercises, session.exercises) : [];
  const planExerciseIds = plan?.exercises.map((exercise) => exercise.exercise.id) ?? [];

  const { data: suggestedLastPerformance } = useQuery({
    queryKey: ['last-performance', 'suggested', plan?.id],
    queryFn: async () => {
      const result = await apiClient.training.lastPerformance({
        query: { exerciseIds: planExerciseIds.join(',') },
      });
      return result.status === 200 ? result.body : [];
    },
    enabled: planExerciseIds.length > 0,
  });

  const removeSession = useMutation({
    mutationFn: async () => {
      const result = await apiClient.training.removeSession({ params: { id: session.id } });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: () => {
      if (isThisSessionActive) end();
      router.push('/tracker');
    },
  });

  const updateExerciseRest = useMutation({
    mutationFn: async ({
      exerciseLogId,
      restSeconds: value,
    }: {
      exerciseLogId: string;
      restSeconds: number;
    }) => {
      const result = await apiClient.training.updateSessionExerciseRest({
        params: { sessionId: session.id, exerciseId: exerciseLogId },
        body: { restSeconds: value },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
  });

  const handleAddRestTime = () => {
    const next = restSeconds + 15;
    setRestSeconds(next);
    rest.setRemaining(rest.remaining + 15);
    if (restExerciseLogId) {
      updateExerciseRest.mutate({ exerciseLogId: restExerciseLogId, restSeconds: next });
    }
  };

  const handleResetRest = () => {
    rest.setRemaining(restSeconds);
  };

  const handleSetLogged = (logged: { id: string; restSeconds: number | null }) => {
    setRestExerciseLogId(logged.id);
    setRestSeconds(logged.restSeconds ?? REST_SECONDS);
    setResting(true);
    router.refresh();
  };

  return (
    <Stack gap="lg" className="pb-24">
      <Link
        href="/tracker"
        className="text-muted-foreground hover:text-primary flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.nav.tracking}
      </Link>

      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
          {dict.activeTracking.duration}
        </Text>
        {isThisSessionActive ? (
          <span className="font-display text-glow-primary text-primary text-6xl tabular-nums">
            {duration}
          </span>
        ) : completedDuration != null ? (
          <span className="font-display text-primary text-6xl tabular-nums">
            {formatDuration(completedDuration)}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="bg-primary text-primary-foreground font-display glow-primary rounded-full px-8 py-3 text-2xl uppercase tracking-wider transition-colors active:scale-95"
          >
            {dict.activeTracking.start}
          </button>
        )}
        {blocked && activeSession && !isThisSessionActive && (
          <Text tone="destructive" variant="caption">
            {dict.activeTracking.alreadyActive}{' '}
            <Link href={`/tracker/${activeSession.sessionId}`} className="underline">
              {dict.activeTracking.goToActive}
            </Link>
          </Text>
        )}
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

      {notYetLogged.length > 0 && (
        <Card className="glass-panel">
          <Text
            tone="muted"
            variant="caption"
            className="font-data mb-3 block tracking-widest uppercase"
          >
            {dict.activeTracking.suggestedNext}
          </Text>
          <Stack gap="sm">
            {notYetLogged.map((planExercise) => {
              const last = suggestedLastPerformance?.find(
                (entry) => entry.exerciseId === planExercise.exercise.id,
              );
              return (
                <button
                  key={planExercise.id}
                  type="button"
                  onClick={() => {
                    setSelected(planExercise.exercise);
                    const prefill = prefillFrom(planExercise, last);
                    setReps(prefill.reps);
                    setWeightKg(prefill.weightKg);
                  }}
                  className="bg-muted hover:bg-accent flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors"
                >
                  <div className="flex flex-col">
                    <Text className="font-medium">{planExercise.exercise.name}</Text>
                    <Text tone="muted" variant="caption" className="font-data">
                      {last
                        ? dict.activeTracking.lastTime(last.weightKg, last.reps, last.date)
                        : dict.sessionDetail.exerciseLine(
                            planExercise.weightKg,
                            planExercise.reps,
                            planExercise.sets,
                          )}
                    </Text>
                  </div>
                </button>
              );
            })}
          </Stack>
        </Card>
      )}

      <AddSessionExerciseCard
        sessionId={session.id}
        loggedExercises={session.exercises}
        selected={selected}
        onSelect={setSelected}
        reps={reps}
        onRepsChange={setReps}
        weightKg={weightKg}
        onWeightKgChange={setWeightKg}
        onSetLogged={handleSetLogged}
      />

      {session.exercises.length === 0 ? (
        <Card className="glass-panel">
          <Text tone="muted">{dict.sessionDetail.noSets}</Text>
        </Card>
      ) : (
        <Stack gap="sm">
          <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
            {dict.activeTracking.loggedExercises}
          </Text>
          {session.exercises.map((exercise) => (
            <ExerciseLogCard
              key={exercise.id}
              sessionId={session.id}
              exercise={exercise}
              onSetLogged={handleSetLogged}
              onChanged={() => router.refresh()}
            />
          ))}
        </Stack>
      )}

      {(resting || isThisSessionActive) && (
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
                    const next = Number.isFinite(value) ? Math.max(0, value) : rest.remaining;
                    rest.setRemaining(next);
                    setRestSeconds(next);
                    setEditingRest(false);
                    if (restExerciseLogId) {
                      updateExerciseRest.mutate({
                        exerciseLogId: restExerciseLogId,
                        restSeconds: next,
                      });
                    }
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
                onClick={handleAddRestTime}
                className="bg-accent hover:text-primary font-data rounded-full px-2 py-1 text-xs uppercase transition-colors"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={handleResetRest}
                className="bg-accent hover:text-primary flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                aria-label="Reset rest timer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
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
          {isThisSessionActive && (
            <ConfirmButton
              variant="outline"
              title={dict.sessionDetail.finishTitle}
              description={dict.sessionDetail.finishDescription}
              confirmLabel={dict.common.finish}
              pending={finishSession.isPending}
              onConfirm={handleFinish}
              className="border-primary text-primary font-display shrink-0 gap-2 rounded-full uppercase"
            >
              <Flag className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              {dict.common.finish}
            </ConfirmButton>
          )}
        </div>
      )}
    </Stack>
  );
}

/** Tap-to-edit number: renders as a plain button until clicked, then an input that commits on blur/Enter. Empty commits `null` (bodyweight/unset); callers that don't accept `null` (e.g. reps) should ignore a `null` commit. */
function EditableNumber({
  value,
  onCommit,
  suffix,
  className,
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  suffix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        step="0.5"
        // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
        autoFocus
        defaultValue={value ?? ''}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          if (raw === '') {
            onCommit(null);
          } else {
            const parsed = Number(raw);
            onCommit(Number.isFinite(parsed) ? Math.max(0, parsed) : value);
          }
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className={`w-14 bg-transparent outline-none ${className ?? ''}`}
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className={className}>
      {value ?? '—'}
      {suffix}
    </button>
  );
}

function ExerciseLogCard({
  sessionId,
  exercise,
  onSetLogged,
  onChanged,
}: {
  sessionId: string;
  exercise: TrainingSessionWithExercises['exercises'][number];
  onSetLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
  onChanged: () => void;
}) {
  const { dict } = useLocale();
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingRestBadge, setEditingRestBadge] = useState(false);

  const updateNotes = useMutation({
    mutationFn: async (notes: string | null) => {
      const result = await apiClient.training.updateSessionExerciseNotes({
        params: { sessionId, exerciseId: exercise.id },
        body: { notes },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: onChanged,
  });

  const updateRest = useMutation({
    mutationFn: async (value: number) => {
      const result = await apiClient.training.updateSessionExerciseRest({
        params: { sessionId, exerciseId: exercise.id },
        body: { restSeconds: value },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
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
      const result = await apiClient.training.updateSessionSet({
        params: { sessionId, exerciseId: exercise.id, setId },
        body: { reps, weightKg },
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: onChanged,
  });

  const removeSet = useMutation({
    mutationFn: async (setId: string) => {
      const result = await apiClient.training.removeSessionSet({
        params: { sessionId, exerciseId: exercise.id, setId },
      });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: onChanged,
  });

  const removeExercise = useMutation({
    mutationFn: async () => {
      const result = await apiClient.training.removeSessionExercise({
        params: { sessionId, exerciseId: exercise.id },
      });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: onChanged,
  });

  const lastSet = exercise.sets[exercise.sets.length - 1];

  return (
    <Card className="glass-panel flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Text className="font-display text-primary text-lg uppercase">
            {exercise.exercise.name}
          </Text>
          {editingNotes ? (
            <input
              type="text"
              // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
              autoFocus
              defaultValue={exercise.notes ?? ''}
              onBlur={(e) => {
                const value = e.target.value.trim();
                updateNotes.mutate(value === '' ? null : value);
                setEditingNotes(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder={dict.sessionDetail.notesPlaceholder}
              className="text-muted-foreground font-data w-full bg-transparent text-xs outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className="text-muted-foreground hover:text-primary font-data text-left text-xs italic"
            >
              {exercise.notes || dict.sessionDetail.notesPlaceholder}
            </button>
          )}
        </div>
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={dict.planDetail.removeExerciseTitle}
          description={dict.sessionDetail.removeExerciseDescription(exercise.exercise.name)}
          pending={removeExercise.isPending}
          onConfirm={() => removeExercise.mutate()}
          className="text-destructive h-7 w-7 shrink-0 p-0"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </ConfirmButton>
      </div>

      <div className="flex items-center gap-1.5">
        <Timer className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
        {editingRestBadge ? (
          <input
            type="number"
            min={0}
            // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
            autoFocus
            defaultValue={exercise.restSeconds ?? ''}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              if (raw !== '') {
                const value = Number(raw);
                if (Number.isFinite(value)) updateRest.mutate(Math.max(0, value));
              }
              setEditingRestBadge(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="font-data text-muted-foreground w-14 bg-transparent text-xs outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingRestBadge(true)}
            className="text-muted-foreground hover:text-primary font-data text-xs"
          >
            {exercise.restSeconds != null ? formatDuration(exercise.restSeconds) : '—'}
          </button>
        )}
      </div>

      <Stack gap="xs">
        {exercise.sets.map((set, index) => (
          <div
            key={set.id}
            className="bg-muted flex items-center justify-between gap-3 rounded-lg p-2"
          >
            <div className="bg-accent font-data flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">
              {index + 1}
            </div>
            <div className="font-data flex flex-1 items-center gap-2 text-sm">
              <EditableNumber
                value={set.reps}
                onCommit={(value) => {
                  if (value != null) {
                    updateSet.mutate({ setId: set.id, reps: value, weightKg: set.weightKg });
                  }
                }}
                className="text-primary tabular-nums"
              />
              <span className="text-muted-foreground">×</span>
              <EditableNumber
                value={set.weightKg}
                onCommit={(value) =>
                  updateSet.mutate({ setId: set.id, reps: set.reps, weightKg: value })
                }
                suffix=" kg"
                className="text-primary tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={() => removeSet.mutate(set.id)}
              className="text-muted-foreground hover:text-destructive shrink-0"
              aria-label={dict.sessionDetail.deleteSetSr}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </Stack>

      {lastSet && (
        <AddSetForm
          sessionId={sessionId}
          exerciseId={exercise.exercise.id}
          lastReps={lastSet.reps}
          lastWeightKg={lastSet.weightKg}
          onLogged={onSetLogged}
        />
      )}
    </Card>
  );
}

function CompactNumberInput({
  value,
  onChange,
  step,
  suffix,
}: {
  value: number | string;
  onChange: (value: string) => void;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-muted border-border flex items-center gap-1 rounded-lg border px-2 py-1.5">
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-data text-primary w-12 bg-transparent text-sm outline-none"
      />
      {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
    </div>
  );
}

function AddSetForm({
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
  reps,
  onRepsChange,
  weightKg,
  onWeightKgChange,
  onSetLogged,
}: {
  sessionId: string;
  loggedExercises: TrainingSessionWithExercises['exercises'];
  selected: Exercise | null;
  onSelect: (exercise: Exercise | null) => void;
  reps: number;
  onRepsChange: (value: number) => void;
  weightKg: string;
  onWeightKgChange: (value: string) => void;
  onSetLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
}) {
  const { dict } = useLocale();

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
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: (group) => {
      const priorRestSeconds = lastPerformance?.restSeconds ?? null;
      onSelect(null);
      onRepsChange(10);
      onWeightKgChange('');
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
          <div className="grid grid-cols-2 gap-3">
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
