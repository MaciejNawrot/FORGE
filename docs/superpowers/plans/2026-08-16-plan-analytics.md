# Plan Detail Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an analytics section (stat cards, volume chart, personal bests, recent sessions) to `/plans/[id]`, scoped to sessions logged from that plan — matching the "Workout Analytics Dashboard" pattern already shipped globally at `/progress`.

**Architecture:** One small backend addition (filter `GET /training-sessions` by `planId`, the column already exists) feeds a new pure stats function and a new presentational component, both added to the existing `plans` feature. The plan editor at `/plans/[id]` is untouched; the new section renders below it.

**Tech Stack:** NestJS + Drizzle (`apps/api`), Next.js App Router + ts-rest client (`apps/web`), Zod contracts shared via `@acme/contracts`, Vitest for tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-16-plan-analytics-design.md` — every task below implements one of its sections.
- Follow existing patterns exactly (component style, dict structure, test style) rather than introducing new conventions — this codebase already has this dashboard pattern built once at `/progress`.
- Any change to `packages/contracts/src/**` requires `pnpm --filter @acme/contracts build` before `apps/api`/`apps/web` will see the updated types (turbo's `typecheck`/`test` tasks depend on `^build`, but running a single package's vitest directly does not trigger it).
- `apps/web/src/shared/i18n/dictionaries/pl.ts` is typed `Dictionary` (from `en.ts`) — any new key added to `en.ts` must be added to `pl.ts` in the same task or `pnpm --filter @acme/web typecheck` fails.

---

## File Structure

- **Modify** `packages/contracts/src/schemas/training.schema.ts` — add optional `planId` to `listTrainingSessionsQuerySchema`.
- **Modify** `apps/api/src/modules/training/training.repository.ts` — `listSessions` gains an optional `planId` filter.
- **Modify** `apps/api/src/modules/training/training.service.ts` — threads `planId` through.
- **Modify** `apps/api/src/modules/training/training.controller.ts` — passes `query.planId` through.
- **Modify** `apps/api/src/modules/training/training.service.spec.ts` — new test for the `planId` passthrough.
- **Create** `apps/web/src/features/plans/lib/plan-analytics.ts` — pure `computePlanStats` function.
- **Create** `apps/web/src/features/plans/lib/plan-analytics.test.ts` — its tests.
- **Modify** `apps/web/src/features/tracker/index.ts` — export the existing `formatDuration` helper (currently internal to `session-detail/use-timers.ts`) so `plans` can reuse it instead of re-implementing mm:ss formatting.
- **Modify** `apps/web/src/shared/i18n/dictionaries/en.ts` and `pl.ts` — new `planAnalytics` namespace (5 keys; everything else reuses existing `progress`/`tracker`/`trainingType` keys).
- **Create** `apps/web/src/features/plans/components/plan-detail/plan-analytics.tsx` — the analytics section component.
- **Modify** `apps/web/src/features/plans/index.ts` — export `PlanAnalytics`.
- **Modify** `apps/web/src/app/plans/[id]/page.tsx` — fetch the plan's sessions, hydrate them, render `PlanAnalytics` below `PlanDetail`; widen the page from `max-w-3xl` to `max-w-5xl` to match `/progress` and `/tracker`'s desktop width.

---

### Task 1: Backend — filter training sessions by plan

**Files:**
- Modify: `packages/contracts/src/schemas/training.schema.ts`
- Modify: `apps/api/src/modules/training/training.repository.ts`
- Modify: `apps/api/src/modules/training/training.service.ts`
- Modify: `apps/api/src/modules/training/training.controller.ts`
- Test: `apps/api/src/modules/training/training.service.spec.ts`

**Interfaces:**
- Produces: `TrainingRepository.listSessions(userId: string, from?: string, to?: string, planId?: string): Promise<TrainingSessionRow[]>`
- Produces: `TrainingService.listSessions(userId: string, from?: string, to?: string, planId?: string): Promise<TrainingSession[]>`
- Produces: `GET /training-sessions?planId=<uuid>` query param (optional, alongside existing `from`/`to`)

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/modules/training/training.service.spec.ts` (new `describe` block, anywhere after the imports/mock factory at the top):

```ts
describe('TrainingService.listSessions', () => {
  it('passes the planId filter through to the repository', async () => {
    const repository = createRepositoryMock({
      listSessions: vi.fn().mockResolvedValue([{ id: 'session-1' }]),
    });
    const service = new TrainingService(repository);

    const result = await service.listSessions('user-1', undefined, undefined, 'plan-1');

    expect(repository.listSessions).toHaveBeenCalledWith('user-1', undefined, undefined, 'plan-1');
    expect(result).toEqual([{ id: 'session-1' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @acme/api exec vitest run src/modules/training/training.service.spec.ts -t "passes the planId filter"`
Expected: FAIL — `repository.listSessions` was called with `('user-1', undefined, undefined)`, missing the 4th `'plan-1'` argument (the service doesn't accept or forward a `planId` param yet).

- [ ] **Step 3: Add the `planId` filter to the repository**

In `apps/api/src/modules/training/training.repository.ts`, replace the `listSessions` method:

```ts
  async listSessions(
    userId: string,
    from?: string,
    to?: string,
    planId?: string,
  ): Promise<TrainingSessionRow[]> {
    const conditions = [eq(trainingSessions.userId, userId)];
    if (from) conditions.push(gte(trainingSessions.date, from));
    if (to) conditions.push(lte(trainingSessions.date, to));
    if (planId) conditions.push(eq(trainingSessions.planId, planId));

    return this.db
      .select()
      .from(trainingSessions)
      .where(and(...conditions))
      .orderBy(asc(trainingSessions.date));
  }
```

- [ ] **Step 4: Thread `planId` through the service**

In `apps/api/src/modules/training/training.service.ts`, replace the `listSessions` method:

```ts
  async listSessions(
    userId: string,
    from?: string,
    to?: string,
    planId?: string,
  ): Promise<TrainingSession[]> {
    return this.trainingRepository.listSessions(userId, from, to, planId);
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @acme/api exec vitest run src/modules/training/training.service.spec.ts -t "passes the planId filter"`
Expected: PASS

- [ ] **Step 6: Add `planId` to the contract and controller**

In `packages/contracts/src/schemas/training.schema.ts`, replace `listTrainingSessionsQuerySchema`:

```ts
export const listTrainingSessionsQuerySchema = z.object({
  from: z.string().regex(isoDatePattern).optional(),
  to: z.string().regex(isoDatePattern).optional(),
  planId: z.string().uuid().optional(),
});
```

In `apps/api/src/modules/training/training.controller.ts`, replace the `listSessions` handler:

```ts
      listSessions: async ({ query }) => {
        const sessions = await this.trainingService.listSessions(
          userId,
          query.from,
          query.to,
          query.planId,
        );
        return { status: 200, body: sessions };
      },
```

- [ ] **Step 7: Rebuild contracts and run the full training test suite**

Run: `pnpm --filter @acme/contracts build && pnpm --filter @acme/api exec vitest run src/modules/training/`
Expected: All tests PASS (existing tests unaffected; new test passes).

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/src/schemas/training.schema.ts \
  apps/api/src/modules/training/training.repository.ts \
  apps/api/src/modules/training/training.service.ts \
  apps/api/src/modules/training/training.controller.ts \
  apps/api/src/modules/training/training.service.spec.ts
git commit -m "feat(api): filter training sessions by planId"
```

---

### Task 2: Web — plan stats pure function

**Files:**
- Create: `apps/web/src/features/plans/lib/plan-analytics.ts`
- Test: `apps/web/src/features/plans/lib/plan-analytics.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no imports from other tasks — structurally typed, same style as `apps/web/src/features/tracker/lib/plan-progress.ts`)
- Produces: `computePlanStats(sessions: SessionLike[]): PlanStats`, where `PlanStats = { totalVolumeKg: number; sessionCount: number; avgDurationSeconds: number; bestByExercise: Map<string, { weight: number; reps: number; date: string }>; volumeBySession: { date: string; volume: number }[] }`. `SessionLike = { date: string; durationSeconds: number | null; exercises: { exercise: { name: string }; sets: { reps: number; weightKg: number | null }[] }[] }`. Task 4 passes a `TrainingSessionWithExercises[]` here — that type satisfies `SessionLike` structurally, no cast needed.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/plans/lib/plan-analytics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computePlanStats } from './plan-analytics';

describe('computePlanStats', () => {
  it('sums volume and duration, and tracks the heaviest set per exercise', () => {
    const sessions = [
      {
        date: '2026-08-01',
        durationSeconds: 3000,
        exercises: [
          {
            exercise: { name: 'Bench Press' },
            sets: [
              { reps: 5, weightKg: 100 },
              { reps: 5, weightKg: 100 },
            ],
          },
        ],
      },
      {
        date: '2026-08-08',
        durationSeconds: 3600,
        exercises: [
          {
            exercise: { name: 'Bench Press' },
            sets: [{ reps: 3, weightKg: 110 }],
          },
        ],
      },
    ];

    const stats = computePlanStats(sessions);

    expect(stats.totalVolumeKg).toBe(5 * 100 + 5 * 100 + 3 * 110);
    expect(stats.sessionCount).toBe(2);
    expect(stats.avgDurationSeconds).toBe(3300);
    expect(stats.bestByExercise.get('Bench Press')).toEqual({
      weight: 110,
      reps: 3,
      date: '2026-08-08',
    });
    expect(stats.volumeBySession).toEqual([
      { date: '2026-08-01', volume: 1000 },
      { date: '2026-08-08', volume: 330 },
    ]);
  });

  it('returns zeroed stats for an empty session list', () => {
    const stats = computePlanStats([]);

    expect(stats.totalVolumeKg).toBe(0);
    expect(stats.sessionCount).toBe(0);
    expect(stats.avgDurationSeconds).toBe(0);
    expect(stats.bestByExercise.size).toBe(0);
    expect(stats.volumeBySession).toEqual([]);
  });

  it('ignores unweighted (bodyweight) sets when tracking personal bests', () => {
    const sessions = [
      {
        date: '2026-08-01',
        durationSeconds: 600,
        exercises: [
          {
            exercise: { name: 'Pull-ups' },
            sets: [{ reps: 10, weightKg: null }],
          },
        ],
      },
    ];

    const stats = computePlanStats(sessions);

    expect(stats.bestByExercise.size).toBe(0);
    expect(stats.totalVolumeKg).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @acme/web exec vitest run src/features/plans/lib/plan-analytics.test.ts`
Expected: FAIL — cannot find module `./plan-analytics` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/features/plans/lib/plan-analytics.ts`:

```ts
type SetLike = { reps: number; weightKg: number | null };
type ExerciseLike = { exercise: { name: string }; sets: SetLike[] };
type SessionLike = { date: string; durationSeconds: number | null; exercises: ExerciseLike[] };

export type PlanStats = {
  totalVolumeKg: number;
  sessionCount: number;
  avgDurationSeconds: number;
  bestByExercise: Map<string, { weight: number; reps: number; date: string }>;
  volumeBySession: { date: string; volume: number }[];
};

/** Volume/duration/best-set summary for the sessions logged from one plan. */
export function computePlanStats(sessions: SessionLike[]): PlanStats {
  const bestByExercise = new Map<string, { weight: number; reps: number; date: string }>();

  const volumeBySession = sessions.map((session) => {
    let volume = 0;
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const weight = set.weightKg ?? 0;
        volume += set.reps * weight;
        const best = bestByExercise.get(exercise.exercise.name);
        if (weight > 0 && (!best || weight > best.weight)) {
          bestByExercise.set(exercise.exercise.name, {
            weight,
            reps: set.reps,
            date: session.date,
          });
        }
      }
    }
    return { date: session.date, volume };
  });

  const totalVolumeKg = volumeBySession.reduce((sum, entry) => sum + entry.volume, 0);
  const totalDuration = sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const avgDurationSeconds = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;

  return {
    totalVolumeKg,
    sessionCount: sessions.length,
    avgDurationSeconds,
    bestByExercise,
    volumeBySession,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @acme/web exec vitest run src/features/plans/lib/plan-analytics.test.ts`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/plans/lib/plan-analytics.ts apps/web/src/features/plans/lib/plan-analytics.test.ts
git commit -m "feat(web): add computePlanStats for plan-scoped session analytics"
```

---

### Task 3: Web — analytics section component

**Files:**
- Modify: `apps/web/src/features/tracker/index.ts`
- Modify: `apps/web/src/shared/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/shared/i18n/dictionaries/pl.ts`
- Create: `apps/web/src/features/plans/components/plan-detail/plan-analytics.tsx`
- Modify: `apps/web/src/features/plans/index.ts`

**Interfaces:**
- Consumes: `computePlanStats` from `./plan-analytics` (Task 2, same relative path `../../lib/plan-analytics` from this component's location); `VolumeChart` from `@/features/progress` (existing); `formatDuration(totalSeconds: number): string` from `@/features/tracker` (newly exported here); `trainingTypeStyles` from `@/utils` (existing); `Dictionary` type from `@/shared/i18n/dictionary` (existing); `TrainingSessionWithExercises` from `@acme/contracts` (existing).
- Produces: `PlanAnalytics({ sessions, dict }: { sessions: TrainingSessionWithExercises[]; dict: Dictionary }): JSX.Element`, exported from `@/features/plans`.

- [ ] **Step 1: Export `formatDuration` from the tracker feature barrel**

In `apps/web/src/features/tracker/index.ts`, add:

```ts
export { formatDuration } from './components/session-detail/use-timers';
```

- [ ] **Step 2: Add the `planAnalytics` dictionary namespace**

In `apps/web/src/shared/i18n/dictionaries/en.ts`, add (e.g. right after the `planDetail` block, before `templates`):

```ts
  planAnalytics: {
    heading: 'Plan Analytics',
    noSessions: 'Log a session from this plan to see analytics here.',
    totalVolume: 'Total Volume',
    sessions: 'Sessions',
    avgDuration: 'Avg Duration',
  },
```

In `apps/web/src/shared/i18n/dictionaries/pl.ts`, add the matching block in the same position (`pl` is typed `Dictionary`, so TypeScript enforces this key exists):

```ts
  planAnalytics: {
    heading: 'Analiza planu',
    noSessions: 'Zaloguj trening z tego planu, aby zobaczyć tu analizy.',
    totalVolume: 'Łączna objętość',
    sessions: 'Treningi',
    avgDuration: 'Śr. czas trwania',
  },
```

- [ ] **Step 3: Create the component**

Create `apps/web/src/features/plans/components/plan-detail/plan-analytics.tsx`:

```tsx
import type { TrainingSessionWithExercises } from '@acme/contracts';
import { Badge, Card, Text } from '@acme/ui';
import { Award } from 'lucide-react';
import Link from 'next/link';
import { VolumeChart } from '@/features/progress';
import { formatDuration } from '@/features/tracker';
import type { Dictionary } from '@/shared/i18n/dictionary';
import { trainingTypeStyles } from '@/utils';
import { computePlanStats } from '../../lib/plan-analytics';

function formatKg(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

export function PlanAnalytics({
  sessions,
  dict,
}: {
  sessions: TrainingSessionWithExercises[];
  dict: Dictionary;
}) {
  if (sessions.length === 0) {
    return <Text tone="muted">{dict.planAnalytics.noSessions}</Text>;
  }

  const stats = computePlanStats(sessions);
  const bestEntries = [...stats.bestByExercise.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3);
  const recentSessions = [...sessions].reverse().slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <Text variant="subheading" className="font-display text-primary text-xl uppercase">
        {dict.planAnalytics.heading}
      </Text>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.planAnalytics.totalVolume}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {formatKg(stats.totalVolumeKg)} <span className="text-lg">kg</span>
          </Text>
        </Card>
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.planAnalytics.sessions}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {stats.sessionCount}
          </Text>
        </Card>
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.planAnalytics.avgDuration}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {formatDuration(stats.avgDurationSeconds)}
          </Text>
        </Card>
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.progress.personalBests}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {stats.bestByExercise.size}
          </Text>
        </Card>
      </div>

      <Card className="glass-panel flex flex-col gap-4">
        <VolumeChart
          values={stats.volumeBySession.map((entry) => entry.volume)}
          labels={stats.volumeBySession.map((entry) => entry.date.slice(5))}
        />
      </Card>

      <Card className="glass-panel flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Award className="text-primary h-5 w-5" aria-hidden="true" />
          <Text variant="subheading" className="font-display text-primary text-xl uppercase">
            {dict.progress.personalBests}
          </Text>
        </div>
        {bestEntries.length === 0 ? (
          <Text tone="muted">{dict.progress.noBests}</Text>
        ) : (
          <div className="flex flex-col gap-3">
            {bestEntries.map(([name, best]) => (
              <div
                key={name}
                className="bg-muted flex items-center justify-between rounded-lg p-3"
              >
                <div className="flex flex-col">
                  <Text className="font-bold">{name}</Text>
                  <Text tone="muted" variant="caption" className="font-data">
                    {dict.progress.bestLine(best.reps, best.date)}
                  </Text>
                </div>
                <Text variant="subheading" className="font-display text-primary">
                  {formatKg(best.weight)}{' '}
                  <span className="text-muted-foreground text-sm">kg</span>
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
          {dict.tracker.recentTrainings}
        </Text>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentSessions.map((session) => {
            const style = trainingTypeStyles[session.type];
            return (
              <Link key={session.id} href={`/tracker/${session.id}`}>
                <Card className="glass-panel hover:border-primary/50 relative flex h-48 flex-col justify-between overflow-hidden transition-colors">
                  <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
                  <div className="relative z-10">
                    <Badge className={style.badge}>{dict.trainingType[session.type]}</Badge>
                  </div>
                  <Text
                    variant="subheading"
                    className="font-display text-primary relative z-10 text-2xl uppercase"
                  >
                    {session.date}
                  </Text>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Export it from the plans feature barrel**

In `apps/web/src/features/plans/index.ts`, add:

```ts
export { PlanAnalytics } from './components/plan-detail/plan-analytics';
```

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web exec biome check src/features/tracker/index.ts src/shared/i18n/dictionaries src/features/plans`
Expected: No errors. (This is the test cycle for this task — a presentational component with one empty-state branch and no other business logic, consistent with `plan-detail/index.tsx` and `/progress`'s page component, neither of which has a component-level test in this codebase.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/tracker/index.ts \
  apps/web/src/shared/i18n/dictionaries/en.ts \
  apps/web/src/shared/i18n/dictionaries/pl.ts \
  apps/web/src/features/plans/components/plan-detail/plan-analytics.tsx \
  apps/web/src/features/plans/index.ts
git commit -m "feat(web): add PlanAnalytics section component"
```

---

### Task 4: Web — wire analytics into `/plans/[id]`

**Files:**
- Modify: `apps/web/src/app/plans/[id]/page.tsx`

**Interfaces:**
- Consumes: `PlanAnalytics` and `PlanDetail` from `@/features/plans` (Task 3); `apiClient.training.listSessions({ query: { planId } })` and `apiClient.training.getSession({ params: { id } })` (Task 1, both already existed on the client — Task 1 only added the `planId` query field).

- [ ] **Step 1: Fetch and hydrate the plan's sessions, render the analytics section**

Replace the full contents of `apps/web/src/app/plans/[id]/page.tsx`:

```tsx
import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { PlanAnalytics, PlanDetail } from '@/features/plans';
import { getServerApiClient } from '@/shared/api/api-server';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function PlanDetailPage({ params }: PageProps<'/plans/[id]'>) {
  const dict = await getServerDictionary();
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.getPlan({ params: { id } });

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.planDetail.loginRequired}</Text>
      </main>
    );
  }
  if (result.status === 404) notFound();

  const sessionsResult = await apiClient.training.listSessions({ query: { planId: id } });
  const sessionList = sessionsResult.status === 200 ? sessionsResult.body : [];
  const sessionDetails = await Promise.all(
    sessionList.map((session) => apiClient.training.getSession({ params: { id: session.id } })),
  );
  const sessions = sessionDetails.flatMap((detail) => (detail.status === 200 ? [detail.body] : []));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-col gap-6">
        <PlanDetail plan={result.body} />
        <PlanAnalytics sessions={sessions} dict={dict} />
      </div>
    </main>
  );
}
```

Note the container width changed from `max-w-2xl`/`max-w-3xl` to `max-w-5xl` (matching `/progress` and `/tracker`) — the 401 branch above keeps its own `max-w-2xl` since it renders a single line of text, not the dashboard.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @acme/web typecheck`
Expected: No errors.

- [ ] **Step 3: Manual verification**

Run: `pnpm dev` (from repo root, or `pnpm --filter @acme/api dev` + `pnpm --filter @acme/web dev` if the root script doesn't cover both — check `package.json`'s `dev` script, which runs `turbo run dev --parallel` across all apps).

In a browser:
1. Log in, open a plan that has at least one training session logged against it (`/tracker` → start a workout from that plan → log a set → finish it), then visit `/plans/<that plan's id>`.
2. Confirm: the plan editor renders as before, followed by a "Plan Analytics" section with 4 stat cards, a volume chart bar for the logged session, a personal-bests card, and a recent-session card linking to `/tracker/<session id>`.
3. Visit a plan with no logged sessions — confirm it shows the "Log a session from this plan…" muted line instead of empty/broken cards.
4. Resize the browser to a mobile width (~390px) — confirm the stat cards collapse to a 2-column grid and session cards stack to 1 column, matching `/progress`'s existing responsive behavior.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/plans/\[id\]/page.tsx
git commit -m "feat(web): render plan analytics on /plans/[id]"
```

---

## Self-Review Notes

- **Spec coverage:** backend `planId` filter → Task 1. `computePlanStats` (volume/session count/avg duration/best-by-exercise) → Task 2. Stat cards, volume chart, personal bests, recent sessions, empty state, i18n → Task 3. Page wiring + widened container → Task 4. RPE/true-PR/pagination/mobile-app explicitly out of scope per spec — no task touches them.
- **Placeholder scan:** none — every step has runnable code or an exact command.
- **Type consistency:** `computePlanStats` (Task 2) takes `SessionLike[]`; `PlanAnalytics` (Task 3) passes `sessions: TrainingSessionWithExercises[]` directly into it — verified `TrainingSessionWithExercises` (`id, userId, planId, date, type, notes, durationSeconds, createdAt, updatedAt, exercises: [{ exercise: { name, ... }, sets: [{ reps, weightKg, ... }], ... }]`) is a structural superset of `SessionLike`, so no cast is needed. `formatDuration(totalSeconds: number): string` signature matches its existing definition in `use-timers.ts`, only the export path changes.
