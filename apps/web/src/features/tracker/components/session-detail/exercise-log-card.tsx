import { Card, Stack, Text } from '@acme/ui';
import { Timer, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmButton } from '@/shared/components';
import { useLocale } from '@/shared/i18n/context';
import type { SessionExerciseRow } from '../../lib/plan-progress';
import { AddSetForm } from './add-set-form';
import { DEFAULT_REST_SECONDS } from './constants';
import { formatDuration } from './format-duration';
import { EditableNumber } from './number-inputs';
import { PlannedSetRow } from './planned-set-row';
import { useExerciseLogMutations } from './use-exercise-log-mutations';

export function ExerciseLogCard({
  sessionId,
  row,
  onSetLogged,
  onChanged,
}: {
  sessionId: string;
  row: SessionExerciseRow;
  onSetLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
  onChanged: () => void;
}) {
  const { dict } = useLocale();
  const { exercise: catalogExercise, loggedExercise, placeholderCount, placeholderPrefill } = row;
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingRestBadge, setEditingRestBadge] = useState(false);
  // Notes/rest can't be persisted until the exercise's first set is logged
  // (there's no session-exercise row for them to attach to yet), so edits
  // made before that land here and get flushed once it exists.
  const [draftNotes, setDraftNotes] = useState('');
  const [draftRestSeconds, setDraftRestSeconds] = useState(DEFAULT_REST_SECONDS);
  const flushedDraftRef = useRef(false);

  const { updateNotes, updateRest, updateSet, removeSet, removeExercise } = useExerciseLogMutations(
    sessionId,
    loggedExercise,
    onChanged,
  );

  const loggedSets = loggedExercise?.sets ?? [];
  const lastSet = loggedSets[loggedSets.length - 1];
  // These edits close their input on commit, so a failed save is otherwise
  // invisible — surface whichever one is currently erroring.
  const mutationError = [updateNotes, updateRest, updateSet, removeSet, removeExercise].find(
    (mutation) => mutation.isError,
  )?.error;

  // biome-ignore lint/correctness/useExhaustiveDependencies: fires exactly once, on the null -> populated transition
  useEffect(() => {
    if (!loggedExercise || flushedDraftRef.current) return;
    flushedDraftRef.current = true;
    const trimmedNotes = draftNotes.trim();
    if (trimmedNotes !== '') updateNotes.mutate(trimmedNotes);
    if (draftRestSeconds !== DEFAULT_REST_SECONDS) {
      updateRest.mutate(draftRestSeconds);
      // The rest countdown for the set that just created this exercise already
      // started from the generic default (this exercise had no persisted
      // restSeconds yet to seed it with) — correct it to the pre-set value.
      onSetLogged({ id: loggedExercise.id, restSeconds: draftRestSeconds });
    }
  }, [loggedExercise]);

  return (
    <Card className="glass-panel flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Text className="font-display text-primary text-lg uppercase">
            {catalogExercise.name}
          </Text>
          {editingNotes ? (
            <input
              type="text"
              // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
              autoFocus
              defaultValue={loggedExercise?.notes ?? draftNotes}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (loggedExercise) {
                  updateNotes.mutate(value === '' ? null : value);
                } else {
                  setDraftNotes(value);
                }
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
              {(loggedExercise?.notes ?? draftNotes) || dict.sessionDetail.notesPlaceholder}
            </button>
          )}
        </div>
        {loggedExercise && (
          <ConfirmButton
            variant="ghost"
            size="sm"
            title={dict.planDetail.removeExerciseTitle}
            description={dict.sessionDetail.removeExerciseDescription(catalogExercise.name)}
            pending={removeExercise.isPending}
            onConfirm={() => removeExercise.mutate()}
            className="text-destructive h-7 w-7 shrink-0 p-0"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dict.sessionDetail.deleteWorkoutSr}</span>
          </ConfirmButton>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Timer className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
        {editingRestBadge ? (
          <input
            type="number"
            min={0}
            // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
            autoFocus
            defaultValue={loggedExercise?.restSeconds ?? draftRestSeconds}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              if (raw !== '') {
                const value = Number(raw);
                if (Number.isFinite(value)) {
                  const next = Math.max(0, value);
                  if (loggedExercise) {
                    updateRest.mutate(next);
                  } else {
                    setDraftRestSeconds(next);
                  }
                }
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
            {formatDuration(loggedExercise?.restSeconds ?? draftRestSeconds)}
          </button>
        )}
      </div>

      <Stack gap="xs">
        {loggedSets.map((set, index) => (
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
                  // The API rejects reps < 1; ignore those like an empty commit.
                  if (value != null && value >= 1) {
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
        {Array.from({ length: placeholderCount }).map((_, i) => (
          // Keyed on loggedSets.length too so every placeholder remounts
          // fresh whenever any set (in any order) gets logged for this
          // exercise — otherwise React reuses a placeholder's DOM node (and
          // its checkbox's checked state) for a different logical row once
          // the array shrinks, and stale prefill values stick around instead
          // of picking up the just-logged set as the new carry-forward.
          <PlannedSetRow
            key={`placeholder-${loggedSets.length}-${i}`}
            sessionId={sessionId}
            exerciseId={catalogExercise.id}
            index={loggedSets.length + i + 1}
            prefillReps={placeholderPrefill.reps}
            prefillWeightKg={placeholderPrefill.weightKg}
            onLogged={onSetLogged}
          />
        ))}
      </Stack>

      {lastSet && (
        <AddSetForm
          // AddSetForm seeds its inputs once on mount; remount it whenever the
          // last set changes (added, deleted, or inline-edited) to re-seed.
          key={`${lastSet.id}:${lastSet.reps}:${lastSet.weightKg}`}
          sessionId={sessionId}
          exerciseId={catalogExercise.id}
          lastReps={lastSet.reps}
          lastWeightKg={lastSet.weightKg}
          onLogged={onSetLogged}
        />
      )}

      {mutationError && (
        <Text variant="caption" tone="destructive">
          {mutationError.message}
        </Text>
      )}
    </Card>
  );
}
