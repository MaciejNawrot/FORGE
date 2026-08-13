# Log-As-You-Go Plan Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `StartPlanButton` from pre-writing every plan exercise into a session at creation time; instead show a "Suggested Next" list on the session-detail page, pre-filled from last-actual-performance, that logs exercises only when the user explicitly confirms.

**Architecture:** `StartPlanButton` shrinks to a single `createSession` call. The session-detail server page conditionally fetches the linked plan. `SessionDetail`'s exercise-logging state (currently local to `AddSessionExerciseCard`) is lifted up so a new "Suggested Next" list can pre-fill it — logging itself still goes through the existing `addSessionExercise` mutation, unchanged.

**Tech Stack:** Next.js (App Router, Server + Client Components), TanStack Query, ts-rest API client (`@acme/api-client`), Zod contracts (`@acme/contracts`), Vitest.

## Global Constraints

- No backend or contract changes — reuse `workouts.getPlan` and `training.lastPerformance` exactly as they exist today.
- No new npm dependencies.
- Preserve the existing en/pl i18n dictionary structure — every new user-facing string needs both locales.
- Follow existing repo conventions: client components own their own TanStack Query calls, mutations follow the existing `status !== 2xx → throw new Error(body.message)` pattern already used throughout `apps/web`.

---

### Task 1: `unloggedPlanExercises` pure helper

**Files:**
- Create: `apps/web/src/lib/plan-progress.ts`
- Create: `apps/web/src/lib/plan-progress.test.ts`

**Interfaces:**
- Produces: `unloggedPlanExercises<P extends { exercise: { id: string } }, L extends { exercise: { id: string } }>(planExercises: P[], loggedExercises: L[]): P[]` — used by Task 5.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/plan-progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { unloggedPlanExercises } from './plan-progress';

describe('unloggedPlanExercises', () => {
  it('keeps plan exercises with no matching logged entry', () => {
    const plan = [{ exercise: { id: 'a' } }, { exercise: { id: 'b' } }];
    const logged = [{ exercise: { id: 'a' } }];

    expect(unloggedPlanExercises(plan, logged)).toEqual([{ exercise: { id: 'b' } }]);
  });

  it('filters out plan exercises already logged, matched by catalog id', () => {
    const plan = [{ exercise: { id: 'a' } }];
    const logged = [{ exercise: { id: 'a' } }];

    expect(unloggedPlanExercises(plan, logged)).toEqual([]);
  });

  it('returns the full plan exercise list unchanged when nothing is logged yet', () => {
    const plan = [{ exercise: { id: 'a' } }, { exercise: { id: 'b' } }];

    expect(unloggedPlanExercises(plan, [])).toEqual(plan);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @acme/web test -- plan-progress.test.ts`
Expected: FAIL — `./plan-progress` doesn't exist yet.

- [ ] **Step 3: Implement it**

Create `apps/web/src/lib/plan-progress.ts`:

```ts
/** Plan exercises whose catalog exercise id has no matching entry in `loggedExercises`. */
export function unloggedPlanExercises<
  P extends { exercise: { id: string } },
  L extends { exercise: { id: string } },
>(planExercises: P[], loggedExercises: L[]): P[] {
  const loggedIds = new Set(loggedExercises.map((entry) => entry.exercise.id));
  return planExercises.filter((entry) => !loggedIds.has(entry.exercise.id));
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm --filter @acme/web test -- plan-progress.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/plan-progress.ts apps/web/src/lib/plan-progress.test.ts
git commit -m "feat(web): add unloggedPlanExercises helper for plan-session suggestions"
```

---

### Task 2: Lift `AddSessionExerciseCard`'s state into `SessionDetail`

Pure, behavior-preserving refactor — no visible change. Prepares `SessionDetail` to drive `AddSessionExerciseCard` from a "Suggested Next" list in Task 5.

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`

**Interfaces:**
- Produces: `AddSessionExerciseCard` becomes a controlled component taking `selected`, `onSelect`, `sets`, `onSetsChange`, `reps`, `onRepsChange`, `weightKg`, `onWeightKgChange` as props (previously all local `useState`).

- [ ] **Step 1: Move the state up to `SessionDetail`**

In `apps/web/src/components/session-detail.tsx`, add to `SessionDetail` (alongside its existing `resting`/`editingRest` state):

```ts
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');
```

- [ ] **Step 2: Pass the lifted state into `AddSessionExerciseCard`**

Change the `<AddSessionExerciseCard />` call inside `SessionDetail`'s JSX from:

```tsx
      <AddSessionExerciseCard
        sessionId={session.id}
        loggedExercises={session.exercises}
        onAdded={() => {
          setResting(true);
          router.refresh();
        }}
      />
```

to:

```tsx
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
```

- [ ] **Step 3: Make `AddSessionExerciseCard` a controlled component**

Replace the `AddSessionExerciseCard` function's signature and internal state — from:

```tsx
function AddSessionExerciseCard({
  sessionId,
  loggedExercises,
  onAdded,
}: {
  sessionId: string;
  loggedExercises: TrainingSessionWithExercises['exercises'];
  onAdded: () => void;
}) {
  const { dict } = useLocale();
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState('');
```

to:

```tsx
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
```

- [ ] **Step 4: Update the remaining references inside `AddSessionExerciseCard`**

Replace the mutation's `onSuccess` — from:

```tsx
    onSuccess: () => {
      setSelected(null);
      setSets(3);
      setReps(10);
      setWeightKg('');
      onAdded();
    },
```

to:

```tsx
    onSuccess: () => {
      onSelect(null);
      onSetsChange(3);
      onRepsChange(10);
      onWeightKgChange('');
      onAdded();
    },
```

Replace the "Change" button's handler — from `onClick={() => setSelected(null)}` to `onClick={() => onSelect(null)}`.

Replace the picker branch — from `<ExercisePicker onSelect={setSelected} />` to `<ExercisePicker onSelect={onSelect} />`.

Replace the three `BigNumberInput`s' `onChange` handlers — from:

```tsx
            <BigNumberInput
              label={dict.common.sets}
              value={sets}
              onChange={(v) => setSets(Number(v))}
            />
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
```

to:

```tsx
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
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass. No behavior change — manually trace: picking an exercise, adjusting numbers, and logging a set should work exactly as before.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/session-detail.tsx
git commit -m "refactor(web): lift AddSessionExerciseCard's pending-exercise state into SessionDetail"
```

---

### Task 3: Simplify `StartPlanButton` — stop pre-writing exercises

**Files:**
- Modify: `apps/web/src/components/start-plan-button.tsx`
- Modify: `apps/web/src/app/tracker/page.tsx`

**Interfaces:**
- Produces: `StartPlanButton({ planId, category }: { planId: string; category: TrainingTypeValue | null })` — `category` is now a required prop instead of being fetched internally.

- [ ] **Step 1: Rewrite `start-plan-button.tsx`**

Replace the full contents of `apps/web/src/components/start-plan-button.tsx`:

```tsx
'use client';

import type { TrainingTypeValue } from '@acme/contracts';
import { Button } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';
import { toLocalIsoDate } from '@/lib/training-colors';

export function StartPlanButton({
  planId,
  category,
}: {
  planId: string;
  category: TrainingTypeValue | null;
}) {
  const router = useRouter();
  const { dict } = useLocale();

  const mutation = useMutation({
    mutationFn: async () => {
      const sessionResult = await apiClient.training.createSession({
        body: {
          date: toLocalIsoDate(new Date()),
          type: category ?? 'strength',
          planId,
        },
      });
      if (sessionResult.status !== 201) throw new Error(sessionResult.body.message);
      return sessionResult.body;
    },
    onSuccess: (session) => router.push(`/tracker/${session.id}`),
  });

  return (
    <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? dict.tracker.starting : dict.tracker.start}
    </Button>
  );
}
```

- [ ] **Step 2: Pass `category` at the call site**

In `apps/web/src/app/tracker/page.tsx`, change:

```tsx
                      <StartPlanButton planId={plan.id} />
```

to:

```tsx
                      <StartPlanButton planId={plan.id} category={plan.category} />
```

(`plan.category` is already in scope here — `plans` comes from `apiClient.workouts.listPlans()`, whose items already carry `category`, confirmed by the existing `plan.category ? trainingTypeStyles[plan.category] : null` line a few lines above in this same file.)

- [ ] **Step 3: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

Manually: starting a plan should create a session and redirect to it, with zero exercises logged yet (previously it would show all plan exercises already logged — that's the point of this change, confirmed fully once Task 5 adds the replacement "Suggested Next" UI).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/start-plan-button.tsx apps/web/src/app/tracker/page.tsx
git commit -m "feat(web): stop StartPlanButton from pre-writing plan exercises into the session"
```

---

### Task 4: Fetch the linked plan on the session-detail page

**Files:**
- Modify: `apps/web/src/app/tracker/[id]/page.tsx`

**Interfaces:**
- Produces: `SessionDetail` now receives a `plan: WorkoutPlanWithExercises | null` prop (consumed by Task 5).

- [ ] **Step 1: Fetch the plan when `session.planId` is set**

Replace the full contents of `apps/web/src/app/tracker/[id]/page.tsx`:

```tsx
import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { SessionDetail } from '@/components/session-detail';
import { getServerApiClient } from '@/lib/api-server';
import { getServerDictionary } from '@/lib/i18n/server';

export default async function TrainingSessionPage({ params }: PageProps<'/tracker/[id]'>) {
  const dict = await getServerDictionary();
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.training.getSession({ params: { id } });

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.sessionDetail.loginRequired}</Text>
      </main>
    );
  }
  if (result.status === 404) notFound();

  const session = result.body;
  const planResult = session.planId
    ? await apiClient.workouts.getPlan({ params: { id: session.planId } })
    : null;
  const plan = planResult && planResult.status === 200 ? planResult.body : null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <SessionDetail session={session} plan={plan} />
    </main>
  );
}
```

`SessionDetail` doesn't accept a `plan` prop yet, so also make this small addition to `apps/web/src/components/session-detail.tsx` in this same task (Task 5 will destructure and use the prop for real; here it's just accepted so the package typechecks cleanly):

Add `WorkoutPlanWithExercises` to the existing `@acme/contracts` type import at the top of the file:

```ts
import type {
  AddTrainingSessionExerciseInput,
  Exercise,
  TrainingSessionWithExercises,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
```

Change `SessionDetail`'s function signature from:

```tsx
export function SessionDetail({ session }: { session: TrainingSessionWithExercises }) {
```

to:

```tsx
export function SessionDetail({
  session,
}: {
  session: TrainingSessionWithExercises;
  plan?: WorkoutPlanWithExercises | null;
}) {
```

(`plan` is accepted but not yet destructured/used — that's fine, TypeScript doesn't require every prop in a type to be read.)

- [ ] **Step 2: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

Manually: open a session that was started from a plan — no crash, no visible change yet (the plan fetch result isn't used by anything visible until Task 5). Open a session with no `planId` (e.g. one created via "Zapisz trening") — also no crash, `plan` is `null`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/tracker/[id]/page.tsx apps/web/src/components/session-detail.tsx
git commit -m "feat(web): fetch the linked plan on the session-detail page"
```

---

### Task 5: "Suggested Next" list in `SessionDetail`

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`
- Modify: `apps/web/src/lib/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/lib/i18n/dictionaries/pl.ts`

**Interfaces:**
- Consumes: `unloggedPlanExercises` (Task 1), the lifted `selected`/`sets`/`reps`/`weightKg` state and its setters (Task 2), the `plan` prop (Task 4).

- [ ] **Step 1: Add the `suggestedNext` dictionary key**

In `apps/web/src/lib/i18n/dictionaries/en.ts`, add to `activeTracking`:

```ts
  activeTracking: {
    duration: 'Active Workout Duration',
    logSet: 'Log Set',
    previousSets: 'Previous Sets',
    resting: 'Resting…',
    suggestedNext: 'Suggested Next',
    lastTime: (weightKg: number | null, reps: number, sets: number, date: string) =>
      `Last time: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps × ${sets} sets (${date})`,
    alreadyTrained: (muscleGroups: string) => `Already trained today: ${muscleGroups}`,
  },
```

In `apps/web/src/lib/i18n/dictionaries/pl.ts`, add to `activeTracking`:

```ts
  activeTracking: {
    duration: 'Czas trwania treningu',
    logSet: 'Zapisz serię',
    previousSets: 'Poprzednie serie',
    resting: 'Odpoczynek…',
    suggestedNext: 'Sugerowane kolejne',
    lastTime: (weightKg: number | null, reps: number, sets: number, date: string) =>
      `Poprzednio: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. × ${sets} serie (${date})`,
    alreadyTrained: (muscleGroups: string) => `Już trenowane dziś: ${muscleGroups}`,
  },
```

- [ ] **Step 2: Wire the `plan` prop and compute `notYetLogged`**

In `apps/web/src/components/session-detail.tsx`, update the imports at the top — add `unloggedPlanExercises` and the `WorkoutPlanWithExercises` type (already added to the type import in Task 4):

```ts
import { alreadyTrainedGroups } from '@/lib/muscle-fatigue';
import { unloggedPlanExercises } from '@/lib/plan-progress';
```

Change `SessionDetail`'s signature (set up in Task 4 as an ignored optional prop) to actually destructure and use `plan`:

```tsx
export function SessionDetail({
  session,
  plan,
}: {
  session: TrainingSessionWithExercises;
  plan?: WorkoutPlanWithExercises | null;
}) {
```

Inside `SessionDetail`, after the lifted state from Task 2, add:

```ts
  const notYetLogged = plan ? unloggedPlanExercises(plan.exercises, session.exercises) : [];

  const { data: suggestedLastPerformance } = useQuery({
    queryKey: ['last-performance', 'suggested', notYetLogged.map((e) => e.exercise.id).join(',')],
    queryFn: async () => {
      const result = await apiClient.training.lastPerformance({
        query: { exerciseIds: notYetLogged.map((e) => e.exercise.id).join(',') },
      });
      return result.status === 200 ? result.body : [];
    },
    enabled: notYetLogged.length > 0,
  });
```

- [ ] **Step 3: Render the "Suggested Next" section**

In `SessionDetail`'s JSX, insert this new block right before the existing `<AddSessionExerciseCard ... />` call:

```tsx
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
                    setSets(last?.sets ?? planExercise.sets);
                    setReps(last?.reps ?? planExercise.reps);
                    const weight = last ? (last.weightKg ?? null) : (planExercise.weightKg ?? null);
                    setWeightKg(weight == null ? '' : String(weight));
                  }}
                  className="bg-muted hover:bg-accent flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors"
                >
                  <div className="flex flex-col">
                    <Text className="font-medium">{planExercise.exercise.name}</Text>
                    <Text tone="muted" variant="caption" className="font-data">
                      {last
                        ? dict.activeTracking.lastTime(last.weightKg, last.reps, last.sets, last.date)
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

```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

- [ ] **Step 5: Manually verify the full flow**

Start a plan (Task 3's now-empty session creation) → land on the session page → confirm a "Suggested Next" section appears listing the plan's exercises, each showing either "Last time: ..." (if you've logged that exercise before) or the plan's plain target line (if not). Tap one → confirm it populates the log card's selected exercise and numbers exactly as if you'd picked it from the search box, but pre-filled. Tap "Log Set" → confirm the exercise moves out of "Suggested Next" and into "Previous Sets", and that an ad hoc exercise sharing a muscle group with a *not-yet-logged* suggested exercise does NOT trigger the "Already trained today" badge (only actually-logged exercises should).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/session-detail.tsx apps/web/src/lib/i18n/dictionaries/en.ts apps/web/src/lib/i18n/dictionaries/pl.ts
git commit -m "feat(web): show a Suggested Next list on session-detail, pre-filled from plan history"
```
