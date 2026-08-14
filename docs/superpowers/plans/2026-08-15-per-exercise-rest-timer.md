# Per-Exercise Rest Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the rest countdown after logging a set default to what that exercise actually needs (learned from last use), and let the user add time or reset the countdown mid-rest without losing progress.

**Architecture:** Persist `restSeconds` on `training_session_exercises` (the same row that already logs sets/reps/weight for a set) — no new table. The existing `lastPerformance` lookup gains this field so the frontend gets "last rest used for this exercise" from a query it already fires. A new `PATCH /training-sessions/:sessionId/exercises/:exerciseId/rest` endpoint persists adjustments. On the frontend, `useCountdown`'s reset effect is fixed to only reseed on rest-period start (not on every target-duration change), and `session-detail.tsx` gains `+15s` / Reset controls.

**Tech Stack:** Drizzle ORM + drizzle-kit (Postgres), ts-rest contracts (Zod), NestJS (repository/service/controller), Next.js + TanStack Query (frontend), Vitest.

## Global Constraints

- No new database table — `restSeconds` lives on `training_session_exercises`, exactly as specified in `docs/superpowers/specs/2026-08-15-per-exercise-rest-timer-design.md`.
- `+15s` is the only add-time increment (no `+30s` button).
- No manual "rest settings" screen — the default is entirely learned from usage.
- No retry/queueing for failed rest-persistence PATCH calls (fire-and-forget).
- No backfill of `restSeconds` for exercises logged before this change — they simply read as "no preference yet" (fallback to the existing 90s constant).
- Follow the exact repo pattern already used for `durationSeconds`/`finishSession` (added in the previous change) for every backend layer: repository → service → controller → contract, one small PATCH endpoint per concern.

---

### Task 1: Persist `restSeconds` on the exercise-log row (DB schema + migration)

**Files:**
- Modify: `packages/db/src/schema/training.ts`

**Interfaces:**
- Produces: `trainingSessionExercises.restSeconds` — nullable integer column, Drizzle column key `restSeconds`, DB column name `rest_seconds`.

- [ ] **Step 1: Add the column to the schema**

In `packages/db/src/schema/training.ts`, the `trainingSessionExercises` table definition currently reads (lines 27–45):

```ts
export const trainingSessionExercises = pgTable(
  'training_session_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => trainingSessions.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    sets: integer('sets').notNull(),
    reps: integer('reps').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('training_session_exercises_sessionId_idx').on(table.sessionId)],
);
```

Add `restSeconds` right after `weightKg`:

```ts
export const trainingSessionExercises = pgTable(
  'training_session_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => trainingSessions.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    sets: integer('sets').notNull(),
    reps: integer('reps').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
    // Rest taken after this set. Null until a rest period tied to this row
    // ends (skip, or a manual +15s/edit adjustment); reused as the default
    // rest duration the next time this exercise is logged.
    restSeconds: integer('rest_seconds'),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('training_session_exercises_sessionId_idx').on(table.sessionId)],
);
```

- [ ] **Step 2: Generate the migration**

Run from the repo root:

```bash
pnpm db:generate
```

Expected: a new file `packages/db/drizzle/0008_<random_name>.sql` containing:

```sql
ALTER TABLE "training_session_exercises" ADD COLUMN "rest_seconds" integer;
```

(The exact random name and `000N` number depend on how many migrations already exist — just confirm the SQL content matches.)

- [ ] **Step 3: Apply the migration to the local dev database**

```bash
pnpm db:migrate
```

Expected: `Migrations complete.` with no errors.

- [ ] **Step 4: Verify the package still builds**

```bash
pnpm --filter @acme/db build
```

Expected: build succeeds (no type errors).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/training.ts packages/db/drizzle/
git commit -m "feat(db): add rest_seconds to training_session_exercises"
```

---

### Task 2: Extend contracts — schemas and the new PATCH endpoint

**Files:**
- Modify: `packages/contracts/src/schemas/training.schema.ts`
- Modify: `packages/contracts/src/contracts/training.contract.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (contracts are independent of the DB package).
- Produces:
  - `TrainingSessionExercise.restSeconds: number | null`
  - `LastPerformanceEntry.restSeconds: number | null`
  - `UpdateSessionExerciseRestInput = { restSeconds: number }`
  - `contract.training.updateSessionExerciseRest`: `PATCH /training-sessions/:sessionId/exercises/:exerciseId/rest`, path params `{ sessionId, exerciseId }` (same `trainingSessionExerciseParamsSchema` already used by `removeSessionExercise` — note `exerciseId` here is the `training_session_exercises` row id, matching that existing endpoint's convention), body `{ restSeconds }`, responses `{ 200: TrainingSessionExercise, 401, 404 }`.

- [ ] **Step 1: Add `restSeconds` to `trainingSessionExerciseSchema`**

In `packages/contracts/src/schemas/training.schema.ts`, this block (lines 9–20):

```ts
export const trainingSessionExerciseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exercise: exerciseSchema,
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  position: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSessionExercise = z.infer<typeof trainingSessionExerciseSchema>;
```

becomes:

```ts
export const trainingSessionExerciseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exercise: exerciseSchema,
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  restSeconds: z.number().int().min(0).nullable(),
  position: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSessionExercise = z.infer<typeof trainingSessionExerciseSchema>;
```

- [ ] **Step 2: Add `updateSessionExerciseRestInputSchema`**

Right after the `addTrainingSessionExerciseInputSchema` block (currently lines 22–28):

```ts
export const addTrainingSessionExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type AddTrainingSessionExerciseInput = z.infer<typeof addTrainingSessionExerciseInputSchema>;
```

add:

```ts

export const updateSessionExerciseRestInputSchema = z.object({
  restSeconds: z.number().int().min(0),
});
export type UpdateSessionExerciseRestInput = z.infer<typeof updateSessionExerciseRestInputSchema>;
```

- [ ] **Step 3: Add `restSeconds` to `lastPerformanceEntrySchema`**

This block (lines 83–90):

```ts
export const lastPerformanceEntrySchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  date: z.string(),
});
export type LastPerformanceEntry = z.infer<typeof lastPerformanceEntrySchema>;
```

becomes:

```ts
export const lastPerformanceEntrySchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  restSeconds: z.number().int().min(0).nullable(),
  date: z.string(),
});
export type LastPerformanceEntry = z.infer<typeof lastPerformanceEntrySchema>;
```

- [ ] **Step 4: Wire the new endpoint into the contract**

In `packages/contracts/src/contracts/training.contract.ts`, add `updateSessionExerciseRestInputSchema` to the import block:

```ts
import {
  addTrainingSessionExerciseInputSchema,
  createTrainingSessionInputSchema,
  finishTrainingSessionInputSchema,
  lastPerformanceEntrySchema,
  lastPerformanceQuerySchema,
  listTrainingSessionsQuerySchema,
  sessionIdParamsSchema,
  trainingSessionExerciseParamsSchema,
  trainingSessionExerciseSchema,
  trainingSessionIdParamsSchema,
  trainingSessionSchema,
  trainingSessionWithExercisesSchema,
  updateSessionExerciseRestInputSchema,
} from '../schemas/training.schema.js';
```

Then add the new route right after `addSessionExercise` and before `removeSessionExercise`:

```ts
  addSessionExercise: {
    method: 'POST',
    path: '/training-sessions/:sessionId/exercises',
    pathParams: sessionIdParamsSchema,
    body: addTrainingSessionExerciseInputSchema,
    responses: {
      201: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Add an exercise to a training session',
  },
  updateSessionExerciseRest: {
    method: 'PATCH',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/rest',
    pathParams: trainingSessionExerciseParamsSchema,
    body: updateSessionExerciseRestInputSchema,
    responses: {
      200: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update the rest time recorded for a logged exercise',
  },
  removeSessionExercise: {
```

(Leave `removeSessionExercise`'s existing body untouched — only its preceding position in the file changes.)

- [ ] **Step 5: Build the package to verify**

```bash
pnpm --filter @acme/contracts build
```

Expected: build succeeds, and `packages/contracts/dist/index.d.ts` contains `updateSessionExerciseRest`:

```bash
grep -n "updateSessionExerciseRest" packages/contracts/dist/index.d.ts
```

Expected: at least one match.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/schemas/training.schema.ts packages/contracts/src/contracts/training.contract.ts
git commit -m "feat(contracts): add restSeconds and the update-rest endpoint"
```

---

### Task 3: Backend — repository, service, controller, and test

**Files:**
- Modify: `apps/api/src/modules/training/training.repository.ts`
- Modify: `apps/api/src/modules/training/training.service.ts`
- Modify: `apps/api/src/modules/training/training.controller.ts`
- Modify: `apps/api/src/modules/training/training.service.spec.ts`

**Interfaces:**
- Consumes: `updateSessionExerciseRestInputSchema` / `trainingSessionExerciseSchema` / `updateSessionExerciseRest` contract entry from Task 2.
- Produces:
  - `TrainingRepository.updateExerciseRest(id: string, sessionId: string, restSeconds: number): Promise<boolean>`
  - `TrainingRepository.lastPerformanceByExerciseIds(...)` — return type's map value gains `restSeconds: number | null`.
  - `TrainingService.updateExerciseRest(sessionId: string, exerciseLogId: string, userId: string, restSeconds: number): Promise<TrainingSessionExercise | undefined>`
  - `PATCH /training-sessions/:sessionId/exercises/:exerciseId/rest` wired end-to-end.

- [ ] **Step 1: Write the failing service test**

In `apps/api/src/modules/training/training.service.spec.ts`, the mock factory currently reads:

```ts
function createRepositoryMock(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    listSessions: vi.fn(),
    findSessionById: vi.fn(),
    createSession: vi.fn(),
    finishSession: vi.fn(),
    removeSession: vi.fn(),
    listSessionExercises: vi.fn(),
    findSessionExerciseById: vi.fn(),
    nextPosition: vi.fn(),
    addExercise: vi.fn(),
    removeExercise: vi.fn(),
    lastPerformanceByExerciseIds: vi.fn(),
    ...overrides,
  } as unknown as TrainingRepository;
}
```

Add `updateExerciseRest: vi.fn(),` to the mock (anywhere in the list, e.g. right after `addExercise`):

```ts
function createRepositoryMock(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    listSessions: vi.fn(),
    findSessionById: vi.fn(),
    createSession: vi.fn(),
    finishSession: vi.fn(),
    removeSession: vi.fn(),
    listSessionExercises: vi.fn(),
    findSessionExerciseById: vi.fn(),
    nextPosition: vi.fn(),
    addExercise: vi.fn(),
    updateExerciseRest: vi.fn(),
    removeExercise: vi.fn(),
    lastPerformanceByExerciseIds: vi.fn(),
    ...overrides,
  } as unknown as TrainingRepository;
}
```

Then add a new `describe` block, right after the existing `describe('TrainingService.finishSession', ...)` block:

```ts
describe('TrainingService.updateExerciseRest', () => {
  it('returns undefined without updating when the session is not owned by the user', async () => {
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue(undefined),
    });
    const service = new TrainingService(repository);

    const result = await service.updateExerciseRest('session-1', 'log-1', 'user-1', 120);

    expect(result).toBeUndefined();
    expect(repository.updateExerciseRest).not.toHaveBeenCalled();
  });

  it('updates the row and returns the enriched exercise on success', async () => {
    const enriched = { id: 'log-1', sessionId: 'session-1', restSeconds: 120 };
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      updateExerciseRest: vi.fn().mockResolvedValue(true),
      findSessionExerciseById: vi.fn().mockResolvedValue(enriched),
    });
    const service = new TrainingService(repository);

    const result = await service.updateExerciseRest('session-1', 'log-1', 'user-1', 120);

    expect(repository.updateExerciseRest).toHaveBeenCalledWith('log-1', 'session-1', 120);
    expect(result).toBe(enriched);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter api exec vitest run src/modules/training/training.service.spec.ts
```

Expected: FAIL — `TrainingService.updateExerciseRest` does not exist (TypeScript/runtime error), since the method hasn't been added yet.

- [ ] **Step 3: Implement the repository method**

In `apps/api/src/modules/training/training.repository.ts`, add `updateExerciseRest` right after `addExercise` and before `removeExercise`:

```ts
  async addExercise(
    input: Pick<
      NewTrainingSessionExerciseRow,
      'sessionId' | 'exerciseId' | 'sets' | 'reps' | 'weightKg' | 'position'
    >,
  ): Promise<TrainingSessionExerciseRow> {
    const [row] = await this.db.insert(trainingSessionExercises).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async updateExerciseRest(id: string, sessionId: string, restSeconds: number): Promise<boolean> {
    const updated = await this.db
      .update(trainingSessionExercises)
      .set({ restSeconds, updatedAt: new Date() })
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .returning({ id: trainingSessionExercises.id });
    return updated.length > 0;
  }

  async removeExercise(id: string, sessionId: string): Promise<boolean> {
```

- [ ] **Step 4: Extend `lastPerformanceByExerciseIds` to return `restSeconds`**

Replace the whole method (currently the last method in the file, after `removeExercise`):

```ts
  async lastPerformanceByExerciseIds(
    userId: string,
    exerciseIds: string[],
  ): Promise<Map<string, { sets: number; reps: number; weightKg: number | null; date: string }>> {
    const rows = await this.db
      .select({
        exerciseId: trainingSessionExercises.exerciseId,
        sets: trainingSessionExercises.sets,
        reps: trainingSessionExercises.reps,
        weightKg: trainingSessionExercises.weightKg,
        date: trainingSessions.date,
        createdAt: trainingSessionExercises.createdAt,
      })
      .from(trainingSessionExercises)
      .innerJoin(trainingSessions, eq(trainingSessions.id, trainingSessionExercises.sessionId))
      .where(
        and(
          eq(trainingSessions.userId, userId),
          inArray(trainingSessionExercises.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(trainingSessions.date), desc(trainingSessionExercises.createdAt));

    const result = new Map<
      string,
      { sets: number; reps: number; weightKg: number | null; date: string }
    >();
    for (const row of rows) {
      // Rows are ordered most-recent-first, so the first row seen per
      // exercise id is that exercise's most recent logged performance.
      if (!result.has(row.exerciseId)) {
        result.set(row.exerciseId, {
          sets: row.sets,
          reps: row.reps,
          weightKg: row.weightKg,
          date: row.date,
        });
      }
    }
    return result;
  }
```

with:

```ts
  async lastPerformanceByExerciseIds(
    userId: string,
    exerciseIds: string[],
  ): Promise<
    Map<
      string,
      { sets: number; reps: number; weightKg: number | null; restSeconds: number | null; date: string }
    >
  > {
    const rows = await this.db
      .select({
        exerciseId: trainingSessionExercises.exerciseId,
        sets: trainingSessionExercises.sets,
        reps: trainingSessionExercises.reps,
        weightKg: trainingSessionExercises.weightKg,
        restSeconds: trainingSessionExercises.restSeconds,
        date: trainingSessions.date,
        createdAt: trainingSessionExercises.createdAt,
      })
      .from(trainingSessionExercises)
      .innerJoin(trainingSessions, eq(trainingSessions.id, trainingSessionExercises.sessionId))
      .where(
        and(
          eq(trainingSessions.userId, userId),
          inArray(trainingSessionExercises.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(trainingSessions.date), desc(trainingSessionExercises.createdAt));

    const result = new Map<
      string,
      { sets: number; reps: number; weightKg: number | null; restSeconds: number | null; date: string }
    >();
    for (const row of rows) {
      // Rows are ordered most-recent-first, so the first row seen per
      // exercise id is that exercise's most recent logged performance.
      if (!result.has(row.exerciseId)) {
        result.set(row.exerciseId, {
          sets: row.sets,
          reps: row.reps,
          weightKg: row.weightKg,
          restSeconds: row.restSeconds,
          date: row.date,
        });
      }
    }
    return result;
  }
```

- [ ] **Step 5: Implement the service method**

In `apps/api/src/modules/training/training.service.ts`, add `updateExerciseRest` right after `finishSession` and before `removeSession`:

```ts
  async finishSession(
    id: string,
    userId: string,
    durationSeconds: number,
  ): Promise<TrainingSession | undefined> {
    return this.trainingRepository.finishSession(id, userId, durationSeconds);
  }

  async updateExerciseRest(
    sessionId: string,
    exerciseLogId: string,
    userId: string,
    restSeconds: number,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const updated = await this.trainingRepository.updateExerciseRest(
      exerciseLogId,
      sessionId,
      restSeconds,
    );
    if (!updated) return undefined;
    return this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
pnpm --filter api exec vitest run src/modules/training/training.service.spec.ts
```

Expected: PASS, all tests including the two new ones.

- [ ] **Step 7: Wire the controller**

In `apps/api/src/modules/training/training.controller.ts`, add the handler right after `addSessionExercise` and before `removeSessionExercise`:

```ts
      addSessionExercise: async ({ params, body }) => {
        const exercise = await this.trainingService.addExercise(params.sessionId, userId, body);
        if (!exercise) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 201, body: exercise };
      },

      updateSessionExerciseRest: async ({ params, body }) => {
        const exercise = await this.trainingService.updateExerciseRest(
          params.sessionId,
          params.exerciseId,
          userId,
          body.restSeconds,
        );
        if (!exercise) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 200, body: exercise };
      },

      removeSessionExercise: async ({ params }) => {
```

- [ ] **Step 8: Run the full API test suite and typecheck**

```bash
pnpm --filter api exec vitest run
pnpm --filter api exec tsc --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/training/
git commit -m "feat(api): add endpoint to persist per-exercise rest time"
```

---

### Task 4: Fix `useCountdown` so mid-rest target changes don't reset progress

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`

**Interfaces:**
- Consumes: nothing new yet — this is a standalone bug fix in a function already in this file.
- Produces: `useCountdown(active: boolean, seconds: number)` — same signature and return shape as before (`{ remaining, setRemaining, display, done }`), but its internal effect now only reseeds `remaining` when `active` starts, not on every `seconds` change.

- [ ] **Step 1: Change the effect's dependency array**

Current code (lines 49–72):

```ts
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
```

Change to:

```ts
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
```

(Note: this project's Biome config does not enable the exhaustive-deps lint rule, confirmed by probing — no suppression comment is needed, a plain explanatory comment is enough.)

- [ ] **Step 2: Verify the file still builds and lints clean**

```bash
pnpm --filter web exec tsc --noEmit
pnpm exec biome check apps/web/src/components/session-detail.tsx
```

Expected: no errors from either command.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/session-detail.tsx
git commit -m "fix(web): stop rest countdown from resetting on target-duration change"
```

---

### Task 5: Thread the just-logged exercise's last-used rest time into `SessionDetail`

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`

**Interfaces:**
- Consumes: `LastPerformanceEntry.restSeconds` (Task 2), rebuilt `@acme/contracts` and `@acme/api-client` packages.
- Produces: `AddSessionExerciseCard`'s `onAdded` prop changes shape from `() => void` to `(loggedExercise: { id: string; restSeconds: number | null }) => void` — `id` is the newly created `training_session_exercises` row id, `restSeconds` is that exercise's previously-saved rest default (`null` if never set).

- [ ] **Step 1: Rebuild the packages the web app reads types from**

The web app resolves `@acme/contracts` and `@acme/api-client` via their built `dist/` output (workspace symlinks, not live source), so Task 2's schema changes won't be visible to `tsc` until both are rebuilt:

```bash
pnpm --filter @acme/contracts build
pnpm --filter @acme/api-client build
```

Expected: both builds succeed.

- [ ] **Step 2: Change `AddSessionExerciseCard`'s `onAdded` prop type**

In `apps/web/src/components/session-detail.tsx`, the `AddSessionExerciseCard` props type currently ends with:

```ts
  weightKg: string;
  onWeightKgChange: (value: string) => void;
  onAdded: () => void;
}) {
```

Change `onAdded`'s type to:

```ts
  weightKg: string;
  onWeightKgChange: (value: string) => void;
  onAdded: (loggedExercise: { id: string; restSeconds: number | null }) => void;
}) {
```

- [ ] **Step 3: Pass the previous rest default through on success**

Inside `AddSessionExerciseCard`, the `addExercise` mutation's `onSuccess` currently reads:

```ts
    onSuccess: () => {
      onSelect(null);
      onSetsChange(3);
      onRepsChange(10);
      onWeightKgChange('');
      onAdded();
    },
```

Change to (react-query passes the mutation's resolved value as the first `onSuccess` argument — the newly created row, whose *own* `restSeconds` is null since nothing's been logged for it yet; the value we actually want is the *previous* `lastPerformance` entry already loaded for the exercise being logged):

```ts
    onSuccess: (created) => {
      const priorRestSeconds = lastPerformance?.restSeconds ?? null;
      onSelect(null);
      onSetsChange(3);
      onRepsChange(10);
      onWeightKgChange('');
      onAdded({ id: created.id, restSeconds: priorRestSeconds });
    },
```

- [ ] **Step 4: Verify the file typechecks**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: errors at the `SessionDetail`'s `<AddSessionExerciseCard onAdded={...} />` call site only (its `onAdded={() => { setResting(true); router.refresh(); }}` no longer matches the new type) — that call site is fixed in Task 6. If there are *other* unrelated errors, stop and investigate before continuing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/session-detail.tsx
git commit -m "feat(web): pass the exercise's last-used rest time up on log"
```

---

### Task 6: Wire rest state, `+15s`/Reset controls, and persistence in `SessionDetail`

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`

**Interfaces:**
- Consumes: `useCountdown` (Task 4), `AddSessionExerciseCard`'s new `onAdded` shape (Task 5), `apiClient.training.updateSessionExerciseRest` (Task 2/3).
- Produces: fully working feature — no further tasks depend on this one.

- [ ] **Step 1: Import the Reset icon and drop the now-unused constant reference**

Current import line:

```ts
import { ArrowLeft, CheckCircle2, Flag, Timer, Trash2, X } from 'lucide-react';
```

Change to:

```ts
import { ArrowLeft, CheckCircle2, Flag, RotateCcw, Timer, Trash2, X } from 'lucide-react';
```

(`REST_SECONDS` stays — it becomes the fallback default when an exercise has no prior `restSeconds`, used in Step 3 below.)

- [ ] **Step 2: Add rest-tracking state**

Current state block:

```ts
  const [resting, setResting] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const rest = useCountdown(resting, REST_SECONDS);
```

Change to:

```ts
  const [resting, setResting] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [restSeconds, setRestSeconds] = useState(REST_SECONDS);
  const [restExerciseLogId, setRestExerciseLogId] = useState<string | null>(null);
  const rest = useCountdown(resting, restSeconds);
```

- [ ] **Step 3: Add the rest-persistence mutation and handlers**

Right after the existing `removeSession` mutation block (before the `return (` that starts the JSX), add:

```ts
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
```

- [ ] **Step 4: Seed rest state when a set is logged**

Current `AddSessionExerciseCard` usage:

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

Change the `onAdded` handler to:

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
        onAdded={(loggedExercise) => {
          setRestExerciseLogId(loggedExercise.id);
          setRestSeconds(loggedExercise.restSeconds ?? REST_SECONDS);
          setResting(true);
          router.refresh();
        }}
      />
```

- [ ] **Step 5: Persist manual edits, and add the `+15s`/Reset buttons**

Current rest pill markup:

```tsx
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
```

Replace with (the `onBlur` handler now also persists the edited value as the new default; two new buttons are added between the number and the skip button):

```tsx
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
                      updateExerciseRest.mutate({ exerciseLogId: restExerciseLogId, restSeconds: next });
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
```

- [ ] **Step 6: Typecheck and lint**

```bash
pnpm --filter web exec tsc --noEmit
pnpm exec biome check apps/web/src/components/session-detail.tsx
```

Expected: no errors from either. If Biome reformats anything, accept its formatting.

- [ ] **Step 7: Manual verification**

Run the app (`pnpm dev` or the project's usual dev command) and, on a training session's detail page:

1. Log a set for an exercise you've never logged before. Confirm the rest pill opens showing `1:30` (90s fallback).
2. Tap `+15s` twice. Confirm it reads `2:00` and does **not** jump back to `1:30` or restart from `2:00` (i.e. it keeps ticking down from wherever it was, just with 15s added each tap — the count doesn't reset).
3. Tap the Reset button. Confirm it jumps back to `2:00` (the current target, not the original `1:30`).
4. Tap the number, type `45`, blur. Confirm the countdown now reads and counts down from `0:45`.
5. Tap skip (X). Log another set for the *same* exercise. Confirm the new rest period starts at `0:45` (the last persisted value), not `1:30`.
6. Reload the page mid-way through a fresh rest period (after step 5) and confirm the default still comes from the backend (i.e. survives a full page reload, not just client state) — open the session again from `/tracker` and log the same exercise once more.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/session-detail.tsx
git commit -m "feat(web): add +15s and reset controls to the per-exercise rest timer"
```

---

### Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suites**

```bash
pnpm --filter api exec vitest run
pnpm --filter web exec vitest run
```

Expected: all pass.

- [ ] **Step 2: Full typecheck across affected packages**

```bash
pnpm --filter @acme/db build
pnpm --filter @acme/contracts build
pnpm --filter @acme/api-client build
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Full lint**

```bash
pnpm exec biome check apps/api/src/modules/training apps/web/src/components/session-detail.tsx packages/contracts/src packages/db/src
```

Expected: no errors.

- [ ] **Step 4: Confirm the migration is applied**

```bash
pnpm db:migrate
```

Expected: `Migrations complete.` (idempotent — no-op if Task 1 already applied it, but confirms a fresh environment would pick it up).
