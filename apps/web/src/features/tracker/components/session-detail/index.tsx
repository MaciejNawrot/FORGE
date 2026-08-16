'use client';

import type {
  Exercise,
  TrainingSessionWithExercises,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { ConfirmButton } from '@/shared/components';
import { useActiveSession, useActiveSessionStore } from '@/shared/hooks';
import { useLocale } from '@/shared/i18n/context';
import { trainingTypeStyles } from '@/utils';
import { prefillFrom, unloggedPlanExercises } from '../../lib/plan-progress';
import { AddSessionExerciseCard } from './add-session-exercise-card';
import { ExerciseLogCard } from './exercise-log-card';
import { formatDuration } from './format-duration';
import { useCountdown, useElapsedTime } from './use-timers';

const REST_SECONDS = 90;

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
