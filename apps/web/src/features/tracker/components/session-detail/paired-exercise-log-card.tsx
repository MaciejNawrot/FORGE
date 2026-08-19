import { Card, Stack, Text } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { Link2Off, Timer } from 'lucide-react';
import { useState } from 'react';
import { apiClient, unwrapResult } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';
import type { SessionExerciseRow } from '../../lib/plan-progress';
import { AddSetForm } from './add-set-form';
import { DEFAULT_REST_SECONDS } from './constants';
import { formatDuration } from './format-duration';
import { EditableNumber } from './number-inputs';
import { PlannedSetRow } from './planned-set-row';
import { useExerciseLogMutations } from './use-exercise-log-mutations';

/** One side of a paired card — same fields `ExerciseLogCard` reads off a `SessionExerciseRow`. */
function useSide(sessionId: string, row: SessionExerciseRow, onChanged: () => void) {
  const mutations = useExerciseLogMutations(sessionId, row.loggedExercise, onChanged);
  return { row, ...mutations };
}

export function PairedExerciseLogCard({
  sessionId,
  rowA,
  rowB,
  onSetLogged,
  onChanged,
}: {
  sessionId: string;
  rowA: SessionExerciseRow;
  rowB: SessionExerciseRow;
  onSetLogged: (loggedExercise: { id: string; restSeconds: number | null }) => void;
  onChanged: () => void;
}) {
  const { dict } = useLocale();
  const sideA = useSide(sessionId, rowA, onChanged);
  const sideB = useSide(sessionId, rowB, onChanged);
  const [editingRestBadge, setEditingRestBadge] = useState(false);

  const restSeconds = rowA.loggedExercise?.restSeconds ?? rowB.loggedExercise?.restSeconds ?? null;

  const unpair = useMutation({
    mutationFn: async () => {
      const anchor = rowA.loggedExercise ?? rowB.loggedExercise;
      if (!anchor) throw new Error('Neither side is logged yet');
      const result = await apiClient.training.unpairSessionExercise({
        params: { sessionId, exerciseId: anchor.id },
      });
      return unwrapResult(result, 200);
    },
    onSuccess: onChanged,
  });

  const setSharedRest = (value: number) => {
    if (rowA.loggedExercise) sideA.updateRest.mutate(value);
    if (rowB.loggedExercise) sideB.updateRest.mutate(value);
    setEditingRestBadge(false);
  };

  return (
    <Card className="glass-panel flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Stack gap="xs">
          <Text className="font-display text-primary text-lg uppercase">
            {rowA.exercise.name} + {rowB.exercise.name}
          </Text>
        </Stack>
        <button
          type="button"
          disabled={unpair.isPending}
          onClick={() => unpair.mutate()}
          className="text-muted-foreground hover:text-destructive shrink-0"
          aria-label={dict.sessionDetail.unpair}
        >
          <Link2Off className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <Timer className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
        {editingRestBadge ? (
          <input
            type="number"
            min={0}
            // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
            autoFocus
            defaultValue={restSeconds ?? DEFAULT_REST_SECONDS}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              if (raw !== '') {
                const value = Number(raw);
                if (Number.isFinite(value)) setSharedRest(Math.max(0, value));
                else setEditingRestBadge(false);
              } else {
                setEditingRestBadge(false);
              }
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
            {formatDuration(restSeconds ?? DEFAULT_REST_SECONDS)}
          </button>
        )}
        <Text tone="muted" variant="caption" className="font-data">
          {dict.activeTracking.pairedRest}
        </Text>
      </div>

      {[sideA, sideB].map((side) => {
        const loggedSets = side.row.loggedExercise?.sets ?? [];
        return (
          <Stack key={side.row.key} gap="xs">
            <Text tone="muted" variant="caption" className="font-data uppercase">
              {side.row.exercise.name}
            </Text>
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
                      if (value != null && value >= 1) {
                        side.updateSet.mutate({
                          setId: set.id,
                          reps: value,
                          weightKg: set.weightKg,
                        });
                      }
                    }}
                    className="text-primary tabular-nums"
                  />
                  <span className="text-muted-foreground">×</span>
                  <EditableNumber
                    value={set.weightKg}
                    onCommit={(value) =>
                      side.updateSet.mutate({ setId: set.id, reps: set.reps, weightKg: value })
                    }
                    suffix=" kg"
                    className="text-primary tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => side.removeSet.mutate(set.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label={dict.sessionDetail.deleteSetSr}
                >
                  ×
                </button>
              </div>
            ))}
            {Array.from({ length: side.row.placeholderCount }).map((_, i) => (
              <PlannedSetRow
                key={`placeholder-${loggedSets.length}-${i}`}
                sessionId={sessionId}
                exerciseId={side.row.exercise.id}
                index={loggedSets.length + i + 1}
                prefillReps={side.row.placeholderPrefill.reps}
                prefillWeightKg={side.row.placeholderPrefill.weightKg}
                onLogged={onSetLogged}
              />
            ))}
            {loggedSets.length > 0 && (
              <AddSetForm
                key={`${loggedSets[loggedSets.length - 1]?.id}`}
                sessionId={sessionId}
                exerciseId={side.row.exercise.id}
                lastReps={loggedSets[loggedSets.length - 1]?.reps ?? 0}
                lastWeightKg={loggedSets[loggedSets.length - 1]?.weightKg ?? null}
                onLogged={onSetLogged}
              />
            )}
          </Stack>
        );
      })}

      {(sideA.updateSet.isError ||
        sideA.removeSet.isError ||
        sideB.updateSet.isError ||
        sideB.removeSet.isError ||
        unpair.isError) && (
        <Text variant="caption" tone="destructive">
          {
            (
              sideA.updateSet.error ??
              sideA.removeSet.error ??
              sideB.updateSet.error ??
              sideB.removeSet.error ??
              unpair.error
            )?.message
          }
        </Text>
      )}
    </Card>
  );
}
