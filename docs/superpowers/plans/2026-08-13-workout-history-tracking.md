# Workout History Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link plan exercises to the exercise catalog, link sessions back to the plan they started from, pre-fill a started plan's exercises with the user's actual last performance, and surface a "muscle already trained today" warning when logging an ad hoc exercise.

**Architecture:** Extend the existing Drizzle schema (`workoutExercises.exerciseId` FK, `trainingSessions.planId` FK) instead of adding a cache layer — all "last time" and fatigue data is computed on demand from tables that already exist, which is appropriate at this app's personal scale. A new `GET /training-sessions/exercises/last-performance` endpoint returns the most recent logged `{sets, reps, weightKg, date}` per exercise id for the current user. Fatigue ("already trained today") is derived client-side from the current session's already-logged exercises, since their `muscleGroups` are already present in the session payload.

**Tech Stack:** NestJS + Drizzle ORM + Postgres (`apps/api`, `packages/db`), ts-rest + Zod contracts (`packages/contracts`), Next.js + TanStack Query + react-hook-form (`apps/web`), Vitest for tests.

## Global Constraints

- Follow existing repo conventions exactly: repository methods return raw Drizzle rows or joined rows; services translate to contract types; controllers are thin `tsRestHandler` dispatchers.
- `pnpm db:generate` (drizzle-kit) must run without needing an interactive prompt — sequence schema changes so each generated migration is unambiguous (see Task 2 vs Task 4).
- No new npm dependencies — everything needed already exists in the workspace.
- Preserve the existing en/pl i18n dictionary structure; every new user-facing string needs both locales.
- Spec: `docs/superpowers/specs/2026-08-13-workout-history-tracking-design.md`.

---

### Task 1: Break the training/workouts schema import cycle

Today `packages/db/src/schema/workouts.ts` imports `trainingTypes` from `training.ts`. Task 2 needs `training.ts` to import `workoutPlans` from `workouts.ts` (for the new `planId` FK), which would create a circular ES module import — and since `workouts.ts` reads `trainingTypes` at module top level (not inside a lazy closure), a real circular import would throw `Cannot access 'trainingTypes' before initialization` at runtime. Extract the shared constant to its own leaf file first so neither schema file depends on the other for it.

**Files:**
- Create: `packages/db/src/schema/training-types.ts`
- Modify: `packages/db/src/schema/training.ts`
- Modify: `packages/db/src/schema/workouts.ts`
- Modify: `packages/db/src/schema/index.ts`

**Interfaces:**
- Produces: `trainingTypes` (readonly array) and `TrainingType` (union type), both exported from `@acme/db` exactly as before — this is a pure refactor, no behavior change.

- [ ] **Step 1: Create the shared constant file**

```ts
// packages/db/src/schema/training-types.ts
/** Fixed, color-coded training types shown on the tracker heatmap. */
export const trainingTypes = ['strength', 'cardio', 'mobility', 'rest'] as const;
export type TrainingType = (typeof trainingTypes)[number];
```

- [ ] **Step 2: Point `training.ts` at the shared file and drop the local definition**

In `packages/db/src/schema/training.ts`, replace:

```ts
import { relations } from 'drizzle-orm';
import { date, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { exercises } from './exercises.js';

/** Fixed, color-coded training types shown on the tracker heatmap. */
export const trainingTypes = ['strength', 'cardio', 'mobility', 'rest'] as const;
export type TrainingType = (typeof trainingTypes)[number];
```

with:

```ts
import { relations } from 'drizzle-orm';
import { date, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { exercises } from './exercises.js';
import { trainingTypes } from './training-types.js';
```

- [ ] **Step 3: Point `workouts.ts` at the shared file**

In `packages/db/src/schema/workouts.ts`, change:

```ts
import { trainingTypes } from './training.js';
```

to:

```ts
import { trainingTypes } from './training-types.js';
```

- [ ] **Step 4: Export the new file from the schema barrel**

In `packages/db/src/schema/index.ts`, add a line so `training-types.ts` is exported (order relative to the others doesn't matter — it has no dependencies):

```ts
export * from './auth.js';
export * from './exercises.js';
export * from './training-types.js';
export * from './training.js';
export * from './users.js';
export * from './workouts.js';
```

- [ ] **Step 5: Verify the refactor is behavior-preserving**

Run: `pnpm --filter @acme/db typecheck && pnpm --filter @acme/db build`
Expected: both succeed with no errors. `trainingTypes`/`TrainingType` are still importable from `@acme/db` (re-exported via the barrel).

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/training-types.ts packages/db/src/schema/training.ts packages/db/src/schema/workouts.ts packages/db/src/schema/index.ts
git commit -m "refactor(db): extract trainingTypes into its own schema file"
```

---

### Task 2: Add nullable `exerciseId` to `workoutExercises` and `planId` to `trainingSessions`

Additive-only schema change (new nullable columns), so `drizzle-kit generate` produces an unambiguous migration with no interactive prompt. The `name` column on `workoutExercises` stays for now — it's dropped in Task 4 after the data is backfilled in Task 3.

**Files:**
- Modify: `packages/db/src/schema/workouts.ts`
- Modify: `packages/db/src/schema/training.ts`
- Create (generated): `packages/db/drizzle/0005_*.sql`

**Interfaces:**
- Produces: `workoutExercises.exerciseId` (nullable uuid, FK → `exercises.id`), `trainingSessions.planId` (nullable uuid, FK → `workoutPlans.id`, `onDelete: 'set null'`). Both available on `WorkoutExerciseRow`/`NewWorkoutExerciseRow` and `TrainingSessionRow`/`NewTrainingSessionRow` via Drizzle's inferred types.

- [ ] **Step 1: Add the nullable `exerciseId` column to `workoutExercises`**

In `packages/db/src/schema/workouts.ts`, add the `exercises` import and the new column:

```ts
import { relations } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { exercises } from './exercises.js';
import { trainingTypes } from './training-types.js';
```

```ts
export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => workoutPlans.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id').references(() => exercises.id),
    name: text('name').notNull(),
    sets: integer('sets').notNull(),
    reps: integer('reps').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('workout_exercises_planId_idx').on(table.planId)],
);
```

- [ ] **Step 2: Add the nullable `planId` column to `trainingSessions`**

In `packages/db/src/schema/training.ts`, add the `workoutPlans` import and the new column:

```ts
import { relations } from 'drizzle-orm';
import { date, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { exercises } from './exercises.js';
import { trainingTypes } from './training-types.js';
import { workoutPlans } from './workouts.js';
```

```ts
export const trainingSessions = pgTable(
  'training_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => workoutPlans.id, { onDelete: 'set null' }),
    // Plain date (no time) — a user can log more than one session per day,
    // so there is deliberately no unique constraint on (userId, date).
    date: date('date', { mode: 'string' }).notNull(),
    type: text('type', { enum: trainingTypes }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('training_sessions_userId_date_idx').on(table.userId, table.date)],
);
```

- [ ] **Step 3: Generate and apply the migration**

Run: `pnpm db:generate`
Expected: a new file `packages/db/drizzle/0005_<name>.sql` containing two additive `ALTER TABLE ... ADD COLUMN` statements (no drops, no prompts).

Run: `DATABASE_URL="postgres://postgres:postgres@localhost:5432/acme_dev" pnpm db:migrate`
Expected: migration applies cleanly against the local dev database.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @acme/db typecheck`
Expected: passes; `WorkoutExerciseRow` now has `exerciseId: string | null` and `TrainingSessionRow` has `planId: string | null`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/workouts.ts packages/db/src/schema/training.ts packages/db/drizzle
git commit -m "feat(db): add nullable exerciseId to workout_exercises and planId to training_sessions"
```

---

### Task 3: Backfill `exerciseId` via an idempotent seed, and add the missing cardio catalog exercises

The `Engine Builder` template (`Interval Sprints`, `Rowing Intervals`, `Bike Sprints`) references exercise names that were never added to the seeded catalog — a pre-existing gap that only mattered for free-text matching before. Add them, then make the seed script backfill `exerciseId` on every run (including for a template that already exists), so re-running `pnpm db:seed` after Task 2's migration fixes any existing rows without a separate one-off script.

**Files:**
- Modify: `packages/db/src/seed.ts`

**Interfaces:**
- Consumes: `exercises`, `workoutExercises`, `workoutPlans` tables from Task 1/2.
- Produces: every `workoutExercises` row for the six seeded templates has `exerciseId` populated after `pnpm db:seed` runs.

- [ ] **Step 1: Add the three missing catalog exercises**

In `packages/db/src/seed.ts`, add these entries to the `exerciseCatalog` array (right before the closing `] as const;` on line 314):

```ts
  {
    name: 'Interval Sprints',
    muscleGroups: ['full body'],
    equipment: 'bodyweight',
    description: 'Short all-out sprint efforts with equal rest between reps.',
  },
  {
    name: 'Rowing Intervals',
    muscleGroups: ['full body'],
    equipment: 'machine',
    description: 'Alternate hard rowing pace with easy recovery strokes.',
  },
  {
    name: 'Bike Sprints',
    muscleGroups: ['full body'],
    equipment: 'machine',
    description: 'Alternate max-effort and easy-pace cycling intervals.',
  },
] as const;
```

- [ ] **Step 2: Build a name → id lookup after seeding the catalog, and a shared row-builder**

In `packages/db/src/seed.ts`, after the existing `exercises` insert block (currently ending around line 411) and before the `for (const template of planTemplates)` loop, add:

```ts
  const catalogRows = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
  const exerciseIdByName = new Map(catalogRows.map((row) => [row.name.toLowerCase(), row.id]));

  function buildExerciseRows(planId: string, template: (typeof planTemplates)[number]) {
    return template.exercises.map((exercise, index) => {
      const exerciseId = exerciseIdByName.get(exercise.name.toLowerCase());
      if (!exerciseId) {
        throw new Error(`Seed template "${template.name}" references unknown exercise "${exercise.name}"`);
      }
      return {
        planId,
        exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        weightKg: exercise.weightKg,
        position: index,
      };
    });
  }
```

- [ ] **Step 3: Reconcile exercises for templates that already exist, instead of skipping them**

Replace the `if (existing) { ... continue; }` branch:

```ts
    if (existing) {
      await db
        .update(workoutPlans)
        .set({ category: template.category })
        .where(eq(workoutPlans.id, existing.id));
      continue;
    }
```

with:

```ts
    if (existing) {
      await db
        .update(workoutPlans)
        .set({ category: template.category })
        .where(eq(workoutPlans.id, existing.id));
      await db.delete(workoutExercises).where(eq(workoutExercises.planId, existing.id));
      await db.insert(workoutExercises).values(buildExerciseRows(existing.id, template));
      continue;
    }
```

- [ ] **Step 4: Use the shared builder for newly-created templates too**

Replace:

```ts
    await db.insert(workoutExercises).values(
      template.exercises.map((exercise, index) => ({
        planId: plan.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weightKg: exercise.weightKg,
        position: index,
      })),
    );
```

with:

```ts
    await db.insert(workoutExercises).values(buildExerciseRows(plan.id, template));
```

- [ ] **Step 5: Run the seed and verify no unmatched exercises remain**

Run: `DATABASE_URL="postgres://postgres:postgres@localhost:5432/acme_dev" pnpm --filter @acme/db db:seed`
Expected: `Seed complete.` with no thrown `references unknown exercise` error. If your local dev database has your own hand-created plans (not seeded templates) that reference exercise names outside the catalog, their `workout_exercises.exercise_id` stays `NULL` — Task 4's migration will fail on those specific rows. If that happens, either delete those plan-exercise rows or re-add them through the app's plan editor (Task 11) after Task 4, using the catalog picker.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/seed.ts
git commit -m "feat(db): backfill workout_exercises.exerciseId via idempotent seed, add missing cardio exercises"
```

---

### Task 4: Finalize `workoutExercises` — require `exerciseId`, drop `name`

Now that Task 3 has backfilled every seeded template, make the column required and remove the free-text column. Because `exerciseId` already existed in the prior migration's snapshot (added in Task 2), this diff is an unambiguous "drop `name`, alter `exercise_id` to `NOT NULL`" — not a rename — so it still generates without a prompt.

**Files:**
- Modify: `packages/db/src/schema/workouts.ts`
- Create (generated): `packages/db/drizzle/0006_*.sql`

**Interfaces:**
- Produces: `WorkoutExerciseRow.exerciseId: string` (no longer nullable), `WorkoutExerciseRow.name` removed.

- [ ] **Step 1: Update the schema**

In `packages/db/src/schema/workouts.ts`, change:

```ts
    exerciseId: uuid('exercise_id').references(() => exercises.id),
    name: text('name').notNull(),
```

to:

```ts
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
```

`text` will now be unused in this file's import — remove it from the `drizzle-orm/pg-core` import list:

```ts
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
```

- [ ] **Step 2: Generate and apply the migration**

Run: `pnpm db:generate`
Expected: a new file `packages/db/drizzle/0006_<name>.sql` with `ALTER TABLE "workout_exercises" DROP COLUMN "name"` and `ALTER TABLE "workout_exercises" ALTER COLUMN "exercise_id" SET NOT NULL`, generated without an interactive prompt.

Run: `DATABASE_URL="postgres://postgres:postgres@localhost:5432/acme_dev" pnpm db:migrate`
Expected: applies cleanly (see Task 3 Step 5 note if it fails on a `NOT NULL` violation).

- [ ] **Step 3: Verify**

Run: `pnpm --filter @acme/db typecheck && pnpm --filter @acme/db build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/workouts.ts packages/db/drizzle
git commit -m "feat(db): require workout_exercises.exerciseId, drop free-text name column"
```

---

### Task 5: Update contracts — plan exercises reference the catalog, sessions carry `planId`, add last-performance

**Files:**
- Modify: `packages/contracts/src/schemas/workout.schema.ts`
- Modify: `packages/contracts/src/schemas/training.schema.ts`
- Modify: `packages/contracts/src/contracts/training.contract.ts`

**Interfaces:**
- Produces: `WorkoutExercise` (now has nested `exercise: Exercise` instead of `name`), `CreateWorkoutExerciseInput` (`exerciseId` instead of `name`), `UpdateWorkoutExerciseInput` (`sets`/`reps`/`weightKg` only — exercise identity isn't editable in place), `TrainingSession.planId`, `CreateTrainingSessionInput.planId`, `LastPerformanceEntry`, and the `training.lastPerformance` contract route.

- [ ] **Step 1: Rewrite `workout.schema.ts`'s exercise schemas**

In `packages/contracts/src/schemas/workout.schema.ts`, replace the top of the file through `updateWorkoutExerciseInputSchema`:

```ts
import { z } from 'zod';
import { exerciseSchema } from './exercise.schema.js';
import { trainingTypeSchema } from './training.schema.js';

export const workoutExerciseSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  exercise: exerciseSchema,
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  position: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const createWorkoutExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type CreateWorkoutExerciseInput = z.infer<typeof createWorkoutExerciseInputSchema>;

export const updateWorkoutExerciseInputSchema = z.object({
  sets: z.number().int().min(1).max(50).optional(),
  reps: z.number().int().min(1).max(500).optional(),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type UpdateWorkoutExerciseInput = z.infer<typeof updateWorkoutExerciseInputSchema>;
```

The rest of the file (`workoutPlanSchema` through `planIdParamsSchema`) stays unchanged.

- [ ] **Step 2: Add `planId` to session schemas and the last-performance schemas**

In `packages/contracts/src/schemas/training.schema.ts`, update `trainingSessionSchema` and `createTrainingSessionInputSchema`:

```ts
export const trainingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  planId: z.string().uuid().nullable(),
  date: z.string(),
  type: trainingTypeSchema,
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSession = z.infer<typeof trainingSessionSchema>;
```

```ts
export const createTrainingSessionInputSchema = z.object({
  date: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
  type: trainingTypeSchema,
  notes: z.string().max(2000).nullable().optional(),
  planId: z.string().uuid().nullable().optional(),
});
export type CreateTrainingSessionInput = z.infer<typeof createTrainingSessionInputSchema>;
```

Then append at the end of the file:

```ts
export const lastPerformanceEntrySchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  date: z.string(),
});
export type LastPerformanceEntry = z.infer<typeof lastPerformanceEntrySchema>;

export const lastPerformanceQuerySchema = z.object({
  // Comma-separated exercise ids, e.g. "id-1,id-2".
  exerciseIds: z.string().min(1),
});
export type LastPerformanceQuery = z.infer<typeof lastPerformanceQuerySchema>;
```

- [ ] **Step 3: Add the `lastPerformance` route**

In `packages/contracts/src/contracts/training.contract.ts`, add the new schemas to the import and add the route. The path is `/training-sessions/exercises/last-performance` — a distinct three-segment path so it can never be shadowed by the two-segment `/training-sessions/:id` route:

```ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  addTrainingSessionExerciseInputSchema,
  createTrainingSessionInputSchema,
  lastPerformanceEntrySchema,
  lastPerformanceQuerySchema,
  listTrainingSessionsQuerySchema,
  sessionIdParamsSchema,
  trainingSessionExerciseParamsSchema,
  trainingSessionExerciseSchema,
  trainingSessionIdParamsSchema,
  trainingSessionSchema,
  trainingSessionWithExercisesSchema,
} from '../schemas/training.schema.js';

const c = initContract();

export const trainingContract = c.router({
  listSessions: {
    method: 'GET',
    path: '/training-sessions',
    query: listTrainingSessionsQuerySchema,
    responses: { 200: z.array(trainingSessionSchema), 401: errorResponseSchema },
    summary: "List the current user's training sessions in a date range",
  },
  lastPerformance: {
    method: 'GET',
    path: '/training-sessions/exercises/last-performance',
    query: lastPerformanceQuerySchema,
    responses: { 200: z.array(lastPerformanceEntrySchema), 401: errorResponseSchema },
    summary: "Get the current user's most recent logged performance per exercise",
  },
  getSession: {
```

(the rest of the router — `getSession` through `removeSessionExercise` — stays exactly as it is today).

- [ ] **Step 4: Verify contracts build**

Run: `pnpm --filter @acme/contracts typecheck && pnpm --filter @acme/contracts build`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/schemas/workout.schema.ts packages/contracts/src/schemas/training.schema.ts packages/contracts/src/contracts/training.contract.ts
git commit -m "feat(contracts): link plan exercises to the catalog, add session planId and last-performance route"
```

---

### Task 6: Update the workouts API module for catalog-linked exercises

**Files:**
- Modify: `apps/api/src/modules/workouts/workouts.repository.ts`
- Modify: `apps/api/src/modules/workouts/workouts.service.ts`

**Interfaces:**
- Consumes: `exercises` table and `ExerciseRow` type from `@acme/db` (already used elsewhere, e.g. `apps/api/src/modules/training/training.repository.ts`).
- Produces: `WorkoutsRepository.listExercises`/`findExerciseById` return `WorkoutExerciseWithExercise` (row + joined `exercise: ExerciseRow`); `addExercise`/`updateExercise` accept the new field shapes; `WorkoutsService.addExercise`/`updateExercise` return the contract's `WorkoutExercise` shape (with nested `exercise`).

- [ ] **Step 1: Update the repository**

Replace the full contents of `apps/api/src/modules/workouts/workouts.repository.ts`:

```ts
import type {
  Database,
  ExerciseRow,
  NewWorkoutExerciseRow,
  NewWorkoutPlanRow,
  WorkoutExerciseRow,
  WorkoutPlanRow,
} from '@acme/db';
import { exercises, workoutExercises, workoutPlans } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, max } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

export type WorkoutPlanRowWithCount = WorkoutPlanRow & { exerciseCount: number };
export type WorkoutExerciseWithExercise = WorkoutExerciseRow & { exercise: ExerciseRow };

@Injectable()
export class WorkoutsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listPlans(userId: string): Promise<WorkoutPlanRowWithCount[]> {
    const rows = await this.db
      .select({
        id: workoutPlans.id,
        userId: workoutPlans.userId,
        name: workoutPlans.name,
        notes: workoutPlans.notes,
        category: workoutPlans.category,
        isTemplate: workoutPlans.isTemplate,
        forkedFromId: workoutPlans.forkedFromId,
        createdAt: workoutPlans.createdAt,
        updatedAt: workoutPlans.updatedAt,
        exerciseCount: count(workoutExercises.id),
      })
      .from(workoutPlans)
      .leftJoin(workoutExercises, eq(workoutExercises.planId, workoutPlans.id))
      .where(eq(workoutPlans.userId, userId))
      .groupBy(workoutPlans.id)
      .orderBy(asc(workoutPlans.createdAt));

    return rows.map((row) => ({ ...row, exerciseCount: Number(row.exerciseCount) }));
  }

  async listTemplates(): Promise<Array<WorkoutPlanRow & { exercises: WorkoutExerciseWithExercise[] }>> {
    const templates = await this.db
      .select()
      .from(workoutPlans)
      .where(eq(workoutPlans.isTemplate, true))
      .orderBy(asc(workoutPlans.createdAt));

    return Promise.all(
      templates.map(async (template) => ({
        ...template,
        exercises: await this.listExercises(template.id),
      })),
    );
  }

  async findTemplateById(id: string): Promise<WorkoutPlanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.isTemplate, true)))
      .limit(1);
    return row;
  }

  /** Deep-copies a template into a new plan owned by `userId`. */
  async forkPlan(template: WorkoutPlanRow, userId: string): Promise<WorkoutPlanRow> {
    const sourceExercises = await this.listExercises(template.id);

    return this.db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(workoutPlans)
        .values({
          userId,
          name: template.name,
          notes: template.notes,
          category: template.category,
          forkedFromId: template.id,
        })
        .returning();
      if (!plan) throw new Error('Insert did not return a row');

      if (sourceExercises.length > 0) {
        await tx.insert(workoutExercises).values(
          sourceExercises.map((exercise) => ({
            planId: plan.id,
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weightKg: exercise.weightKg,
            position: exercise.position,
          })),
        );
      }

      return plan;
    });
  }

  async findPlanById(id: string, userId: string): Promise<WorkoutPlanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .limit(1);
    return row;
  }

  async listExercises(planId: string): Promise<WorkoutExerciseWithExercise[]> {
    return this.db
      .select({
        id: workoutExercises.id,
        planId: workoutExercises.planId,
        exerciseId: workoutExercises.exerciseId,
        sets: workoutExercises.sets,
        reps: workoutExercises.reps,
        weightKg: workoutExercises.weightKg,
        position: workoutExercises.position,
        createdAt: workoutExercises.createdAt,
        updatedAt: workoutExercises.updatedAt,
        exercise: exercises,
      })
      .from(workoutExercises)
      .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
      .where(eq(workoutExercises.planId, planId))
      .orderBy(asc(workoutExercises.position));
  }

  async createPlan(
    input: Pick<NewWorkoutPlanRow, 'userId' | 'name' | 'notes' | 'category'>,
  ): Promise<WorkoutPlanRow> {
    const [row] = await this.db.insert(workoutPlans).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async updatePlan(
    id: string,
    userId: string,
    input: Partial<Pick<NewWorkoutPlanRow, 'name' | 'notes' | 'category'>>,
  ): Promise<WorkoutPlanRow | undefined> {
    const [row] = await this.db
      .update(workoutPlans)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .returning();
    return row;
  }

  async removePlan(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .returning({ id: workoutPlans.id });
    return deleted.length > 0;
  }

  /** Next free `position` for a new exercise appended to the end of a plan. */
  async nextPosition(planId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(workoutExercises.position) })
      .from(workoutExercises)
      .where(eq(workoutExercises.planId, planId));
    return (row?.value ?? -1) + 1;
  }

  async addExercise(
    input: Pick<
      NewWorkoutExerciseRow,
      'planId' | 'exerciseId' | 'sets' | 'reps' | 'weightKg' | 'position'
    >,
  ): Promise<WorkoutExerciseRow> {
    const [row] = await this.db.insert(workoutExercises).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async findExerciseById(id: string, planId: string): Promise<WorkoutExerciseWithExercise | undefined> {
    const [row] = await this.db
      .select({
        id: workoutExercises.id,
        planId: workoutExercises.planId,
        exerciseId: workoutExercises.exerciseId,
        sets: workoutExercises.sets,
        reps: workoutExercises.reps,
        weightKg: workoutExercises.weightKg,
        position: workoutExercises.position,
        createdAt: workoutExercises.createdAt,
        updatedAt: workoutExercises.updatedAt,
        exercise: exercises,
      })
      .from(workoutExercises)
      .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
      .where(and(eq(workoutExercises.id, id), eq(workoutExercises.planId, planId)))
      .limit(1);
    return row;
  }

  async updateExercise(
    id: string,
    planId: string,
    input: Partial<Pick<NewWorkoutExerciseRow, 'sets' | 'reps' | 'weightKg'>>,
  ): Promise<WorkoutExerciseRow | undefined> {
    const [row] = await this.db
      .update(workoutExercises)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(workoutExercises.id, id), eq(workoutExercises.planId, planId)))
      .returning();
    return row;
  }

  async removeExercise(id: string, planId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(workoutExercises)
      .where(and(eq(workoutExercises.id, id), eq(workoutExercises.planId, planId)))
      .returning({ id: workoutExercises.id });
    return deleted.length > 0;
  }
}
```

- [ ] **Step 2: Update the service to re-fetch the joined row after add/update**

Replace the full contents of `apps/api/src/modules/workouts/workouts.service.ts`:

```ts
import type {
  CreateWorkoutExerciseInput,
  CreateWorkoutPlanInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutPlanInput,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutPlanListItem,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { WorkoutsRepository } from './workouts.repository.js';

@Injectable()
export class WorkoutsService {
  constructor(private readonly workoutsRepository: WorkoutsRepository) {}

  async listPlans(userId: string): Promise<WorkoutPlanListItem[]> {
    return this.workoutsRepository.listPlans(userId);
  }

  async listTemplates(): Promise<WorkoutPlanWithExercises[]> {
    return this.workoutsRepository.listTemplates();
  }

  async forkPlan(templateId: string, userId: string): Promise<WorkoutPlan | undefined> {
    const template = await this.workoutsRepository.findTemplateById(templateId);
    if (!template) return undefined;
    return this.workoutsRepository.forkPlan(template, userId);
  }

  async getPlan(id: string, userId: string): Promise<WorkoutPlanWithExercises | undefined> {
    const plan = await this.workoutsRepository.findPlanById(id, userId);
    if (!plan) return undefined;
    const exercises = await this.workoutsRepository.listExercises(id);
    return { ...plan, exercises };
  }

  async createPlan(userId: string, input: CreateWorkoutPlanInput): Promise<WorkoutPlan> {
    return this.workoutsRepository.createPlan({
      userId,
      name: input.name,
      notes: input.notes ?? null,
      category: input.category ?? null,
    });
  }

  async updatePlan(
    id: string,
    userId: string,
    input: UpdateWorkoutPlanInput,
  ): Promise<WorkoutPlan | undefined> {
    return this.workoutsRepository.updatePlan(id, userId, input);
  }

  async removePlan(id: string, userId: string): Promise<boolean> {
    return this.workoutsRepository.removePlan(id, userId);
  }

  async addExercise(
    planId: string,
    userId: string,
    input: CreateWorkoutExerciseInput,
  ): Promise<WorkoutExercise | undefined> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return undefined;
    const position = await this.workoutsRepository.nextPosition(planId);
    const created = await this.workoutsRepository.addExercise({
      planId,
      exerciseId: input.exerciseId,
      sets: input.sets,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      position,
    });
    return this.workoutsRepository.findExerciseById(created.id, planId);
  }

  async updateExercise(
    planId: string,
    exerciseId: string,
    userId: string,
    input: UpdateWorkoutExerciseInput,
  ): Promise<WorkoutExercise | undefined> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return undefined;
    const updated = await this.workoutsRepository.updateExercise(exerciseId, planId, input);
    if (!updated) return undefined;
    return this.workoutsRepository.findExerciseById(exerciseId, planId);
  }

  async removeExercise(planId: string, exerciseId: string, userId: string): Promise<boolean> {
    const plan = await this.workoutsRepository.findPlanById(planId, userId);
    if (!plan) return false;
    return this.workoutsRepository.removeExercise(exerciseId, planId);
  }
}
```

Note: `workouts.controller.ts` needs no changes — it already passes `body`/`params` straight through generically.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @acme/api typecheck`
Expected: passes (this will fail loudly if any caller still expects `.name` on a `WorkoutExercise` — that's expected until Task 11 updates the web components; the API package itself must be clean).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/workouts/workouts.repository.ts apps/api/src/modules/workouts/workouts.service.ts
git commit -m "feat(api): join workout_exercises to the exercise catalog instead of free-text names"
```

---

### Task 7: Add `planId` passthrough and the last-performance endpoint to the training module

**Files:**
- Modify: `apps/api/src/modules/training/training.repository.ts`
- Modify: `apps/api/src/modules/training/training.service.ts`
- Modify: `apps/api/src/modules/training/training.controller.ts`
- Create: `apps/api/src/modules/training/training.service.spec.ts`

**Interfaces:**
- Produces: `TrainingRepository.lastPerformanceByExerciseIds(userId, exerciseIds): Promise<Map<string, {sets, reps, weightKg, date}>>`; `TrainingService.getLastPerformance(userId, exerciseIds): Promise<LastPerformanceEntry[]>` (from `@acme/contracts`); `TrainingController` handles the `lastPerformance` contract route.

- [ ] **Step 1: Write the failing service test first**

Create `apps/api/src/modules/training/training.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { TrainingRepository } from './training.repository.js';
import { TrainingService } from './training.service.js';

function createRepositoryMock(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    listSessions: vi.fn(),
    findSessionById: vi.fn(),
    createSession: vi.fn(),
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

describe('TrainingService.getLastPerformance', () => {
  it('returns an entry only for exercise ids that have history', async () => {
    const repository = createRepositoryMock({
      lastPerformanceByExerciseIds: vi
        .fn()
        .mockResolvedValue(new Map([['ex-2', { sets: 3, reps: 8, weightKg: 40, date: '2026-08-06' }]])),
    });
    const service = new TrainingService(repository);

    const result = await service.getLastPerformance('user-1', ['ex-1', 'ex-2']);

    expect(result).toEqual([{ exerciseId: 'ex-2', sets: 3, reps: 8, weightKg: 40, date: '2026-08-06' }]);
  });

  it('returns an empty array without querying when no exercise ids are given', async () => {
    const repository = createRepositoryMock();
    const service = new TrainingService(repository);

    const result = await service.getLastPerformance('user-1', []);

    expect(result).toEqual([]);
    expect(repository.lastPerformanceByExerciseIds).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @acme/api test -- training.service.spec.ts`
Expected: FAIL — `TrainingService.getLastPerformance` does not exist yet.

- [ ] **Step 3: Add the repository method**

In `apps/api/src/modules/training/training.repository.ts`, update the import line and add the new method at the end of the class (after `removeExercise`):

```ts
import { and, asc, desc, eq, gte, inArray, lte, max } from 'drizzle-orm';
```

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

    const result = new Map<string, { sets: number; reps: number; weightKg: number | null; date: string }>();
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

Also update `createSession` to accept `planId`:

```ts
  async createSession(
    input: Pick<NewTrainingSessionRow, 'userId' | 'planId' | 'date' | 'type' | 'notes'>,
  ): Promise<TrainingSessionRow> {
    const [row] = await this.db.insert(trainingSessions).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }
```

- [ ] **Step 4: Add the service method and `planId` passthrough**

In `apps/api/src/modules/training/training.service.ts`, update the import and `createSession`, and add `getLastPerformance`:

```ts
import type {
  AddTrainingSessionExerciseInput,
  CreateTrainingSessionInput,
  LastPerformanceEntry,
  TrainingSession,
  TrainingSessionExercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
```

```ts
  async createSession(userId: string, input: CreateTrainingSessionInput): Promise<TrainingSession> {
    return this.trainingRepository.createSession({
      userId,
      planId: input.planId ?? null,
      date: input.date,
      type: input.type,
      notes: input.notes ?? null,
    });
  }
```

```ts
  async getLastPerformance(userId: string, exerciseIds: string[]): Promise<LastPerformanceEntry[]> {
    if (exerciseIds.length === 0) return [];
    const map = await this.trainingRepository.lastPerformanceByExerciseIds(userId, exerciseIds);
    return exerciseIds.flatMap((exerciseId) => {
      const entry = map.get(exerciseId);
      return entry ? [{ exerciseId, ...entry }] : [];
    });
  }
```

- [ ] **Step 5: Run the test again to confirm it passes**

Run: `pnpm --filter @acme/api test -- training.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Wire the controller handler**

In `apps/api/src/modules/training/training.controller.ts`, add the `lastPerformance` handler inside the `tsRestHandler(trainingContract, { ... })` object (order doesn't matter functionally, but place it near `listSessions` to mirror the contract):

```ts
      listSessions: async ({ query }) => {
        const sessions = await this.trainingService.listSessions(userId, query.from, query.to);
        return { status: 200, body: sessions };
      },

      lastPerformance: async ({ query }) => {
        const exerciseIds = query.exerciseIds.split(',');
        const entries = await this.trainingService.getLastPerformance(userId, exerciseIds);
        return { status: 200, body: entries };
      },
```

- [ ] **Step 7: Full module verification**

Run: `pnpm --filter @acme/api typecheck && pnpm --filter @acme/api test`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/training/training.repository.ts apps/api/src/modules/training/training.service.ts apps/api/src/modules/training/training.controller.ts apps/api/src/modules/training/training.service.spec.ts
git commit -m "feat(api): add training-session planId passthrough and last-performance endpoint"
```

---

### Task 8: Muscle-fatigue derivation (pure function + test)

**Files:**
- Create: `apps/web/src/lib/muscle-fatigue.ts`
- Create: `apps/web/src/lib/muscle-fatigue.test.ts`

**Interfaces:**
- Produces: `alreadyTrainedGroups(candidateMuscleGroups: string[], loggedExercises: Array<{ exercise: { muscleGroups: string[] } }>): string[]` — used by Task 10.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/muscle-fatigue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { alreadyTrainedGroups } from './muscle-fatigue';

describe('alreadyTrainedGroups', () => {
  it('returns muscle groups shared with already-logged exercises', () => {
    const logged = [
      { exercise: { muscleGroups: ['chest', 'triceps'] } },
      { exercise: { muscleGroups: ['back'] } },
    ];

    expect(alreadyTrainedGroups(['back', 'biceps'], logged)).toEqual(['back']);
  });

  it('returns an empty array when nothing overlaps', () => {
    const logged = [{ exercise: { muscleGroups: ['legs'] } }];

    expect(alreadyTrainedGroups(['chest'], logged)).toEqual([]);
  });

  it('returns an empty array when no exercises have been logged yet', () => {
    expect(alreadyTrainedGroups(['chest'], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @acme/web test -- muscle-fatigue.test.ts`
Expected: FAIL — `./muscle-fatigue` doesn't exist yet.

- [ ] **Step 3: Implement it**

Create `apps/web/src/lib/muscle-fatigue.ts`:

```ts
type LoggedExercise = { exercise: { muscleGroups: string[] } };

function trainedMuscleGroups(loggedExercises: LoggedExercise[]): Set<string> {
  const groups = new Set<string>();
  for (const entry of loggedExercises) {
    for (const group of entry.exercise.muscleGroups) groups.add(group);
  }
  return groups;
}

/** Which of `candidateMuscleGroups` were already hit by exercises logged earlier in the session. */
export function alreadyTrainedGroups(
  candidateMuscleGroups: string[],
  loggedExercises: LoggedExercise[],
): string[] {
  const trained = trainedMuscleGroups(loggedExercises);
  return candidateMuscleGroups.filter((group) => trained.has(group));
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm --filter @acme/web test -- muscle-fatigue.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/muscle-fatigue.ts apps/web/src/lib/muscle-fatigue.test.ts
git commit -m "feat(web): add pure function to derive already-trained muscle groups"
```

---

### Task 9: Extract a shared `ExercisePicker` component

`AddSessionExerciseCard` (in `session-detail.tsx`) already has a working catalog search-and-select UI. Task 10 keeps using it and Task 11 needs the identical behavior for the plan editor, so extract it now rather than duplicating the search/list/select JSX in two places.

**Files:**
- Create: `apps/web/src/components/exercise-picker.tsx`
- Modify: `apps/web/src/components/session-detail.tsx`

**Interfaces:**
- Produces: `ExercisePicker({ onSelect: (exercise: Exercise) => void })` — `Exercise` is `@acme/contracts`'s catalog exercise type (`{ id, name, muscleGroups, equipment, description, ... }`).

- [ ] **Step 1: Create the shared component**

Create `apps/web/src/components/exercise-picker.tsx`:

```tsx
'use client';

import type { Exercise } from '@acme/contracts';
import { Input, Text } from '@acme/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';

export function ExercisePicker({ onSelect }: { onSelect: (exercise: Exercise) => void }) {
  const { dict } = useLocale();
  const [search, setSearch] = useState('');

  const { data: results } = useQuery({
    queryKey: ['exercises', search],
    queryFn: async () => {
      const result = await apiClient.exercises.listExercises({ query: { search } });
      return result.status === 200 ? result.body : [];
    },
    enabled: search.trim().length > 0,
  });

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder={dict.common.searchExercises}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {results && results.length > 0 && (
        <div className="border-border max-h-48 overflow-y-auto rounded-md border">
          {results.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => {
                onSelect(exercise);
                setSearch('');
              }}
              className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left"
            >
              <span className="text-sm font-medium">{exercise.name}</span>
              <span className="text-muted-foreground text-xs">{exercise.muscleGroups.join(', ')}</span>
            </button>
          ))}
        </div>
      )}
      {search.trim().length > 0 && results && results.length === 0 && (
        <Text tone="muted" variant="caption">
          {dict.common.noExercisesMatch(search)}
        </Text>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Use it from `AddSessionExerciseCard`**

In `apps/web/src/components/session-detail.tsx`, this step only swaps the picker UI — the last-performance caption and fatigue badge are added in Task 10 so this step stays reviewable on its own. Add the import:

```ts
import { ExercisePicker } from '@/components/exercise-picker';
```

Replace the component's search-related state and the `!selected` branch. Remove these two lines from `AddSessionExerciseCard`:

```ts
  const [search, setSearch] = useState('');
```

and the whole `results` query block:

```ts
  const { data: results } = useQuery({
    queryKey: ['exercises', search],
    queryFn: async () => {
      const result = await apiClient.exercises.listExercises({ query: { search } });
      return result.status === 200 ? result.body : [];
    },
    enabled: search.trim().length > 0 && !selected,
  });
```

and change `setSelected(null); setSearch('');` (in `addExercise`'s `onSuccess`) to just `setSelected(null);`.

Replace the `!selected` JSX branch:

```tsx
      {!selected ? (
        <Stack gap="sm">
          <Input
            placeholder={dict.common.searchExercises}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {results && results.length > 0 && (
            <div className="border-border max-h-48 overflow-y-auto rounded-md border">
              {results.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => {
                    setSelected({ id: exercise.id, name: exercise.name });
                    setSearch('');
                  }}
                  className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left"
                >
                  <span className="text-sm font-medium">{exercise.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {exercise.muscleGroups.join(', ')}
                  </span>
                </button>
              ))}
            </div>
          )}
          {search.trim().length > 0 && results && results.length === 0 && (
            <Text tone="muted" variant="caption">
              {dict.common.noExercisesMatch(search)}
            </Text>
          )}
        </Stack>
      ) : (
```

with:

```tsx
      {!selected ? (
        <ExercisePicker onSelect={(exercise) => setSelected({ id: exercise.id, name: exercise.name })} />
      ) : (
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @acme/web typecheck`
Expected: passes (an unused `Input` import warning here is fine — `Input` is still used elsewhere in the same file for `BigNumberInput`... actually `BigNumberInput` uses a raw `<input>`, so double-check: if `Input` from `@acme/ui` becomes unused in `session-detail.tsx`, remove it from the import list).

Run: `pnpm --filter @acme/web lint`
Expected: passes (biome will flag any now-unused import).

- [ ] **Step 4: Manually verify behavior is unchanged**

Start the app (see Task 13) and confirm adding an ad hoc exercise to an active session still works exactly as before: search, pick, enter sets/reps/weight, log.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/exercise-picker.tsx apps/web/src/components/session-detail.tsx
git commit -m "refactor(web): extract ExercisePicker out of AddSessionExerciseCard"
```

---

### Task 10: Show last-time performance and a fatigue badge when logging an ad hoc exercise

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`
- Modify: `apps/web/src/lib/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/lib/i18n/dictionaries/pl.ts`

**Interfaces:**
- Consumes: `apiClient.training.lastPerformance` (Task 7), `alreadyTrainedGroups` (Task 8).

- [ ] **Step 1: Add the new dictionary strings**

In `apps/web/src/lib/i18n/dictionaries/en.ts`, add two entries to `activeTracking`:

```ts
  activeTracking: {
    duration: 'Active Workout Duration',
    logSet: 'Log Set',
    previousSets: 'Previous Sets',
    resting: 'Resting…',
    lastTime: (weightKg: number | null, reps: number, sets: number, date: string) =>
      `Last time: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps × ${sets} sets (${date})`,
    alreadyTrained: (muscleGroups: string) => `Already trained today: ${muscleGroups}`,
  },
```

In `apps/web/src/lib/i18n/dictionaries/pl.ts`, add the matching Polish entries:

```ts
  activeTracking: {
    duration: 'Czas trwania treningu',
    logSet: 'Zapisz serię',
    previousSets: 'Poprzednie serie',
    resting: 'Odpoczynek…',
    lastTime: (weightKg: number | null, reps: number, sets: number, date: string) =>
      `Poprzednio: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. × ${sets} serie (${date})`,
    alreadyTrained: (muscleGroups: string) => `Już trenowane dziś: ${muscleGroups}`,
  },
```

- [ ] **Step 2: Track full `Exercise` objects and fetch last performance on selection**

In `apps/web/src/components/session-detail.tsx`, update `AddSessionExerciseCard`'s imports and props:

```ts
import type {
  AddTrainingSessionExerciseInput,
  Exercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
```

```ts
import { alreadyTrainedGroups } from '@/lib/muscle-fatigue';
```

Change the `selected` state type from `{ id: string; name: string } | null` to `Exercise | null`, add a `loggedExercises` prop, and add the last-performance query. Replace the top of `AddSessionExerciseCard`:

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

  const alreadyTrained = selected ? alreadyTrainedGroups(selected.muscleGroups, loggedExercises) : [];
```

Update `setSelected({ id: exercise.id, name: exercise.name })` (from Task 9) back to just `setSelected(exercise)` since `selected` is now the full `Exercise`:

```tsx
      {!selected ? (
        <ExercisePicker onSelect={setSelected} />
      ) : (
```

- [ ] **Step 3: Render the caption and badge**

Update the `{selected && ( ... )}` header block:

```tsx
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
            onClick={() => setSelected(null)}
            className="font-data text-muted-foreground hover:text-primary text-xs uppercase"
          >
            {dict.common.change}
          </button>
        </div>
      )}
```

- [ ] **Step 4: Pass logged exercises down from `SessionDetail`**

In `SessionDetail`, update the `<AddSessionExerciseCard />` call:

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

- [ ] **Step 5: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

Manually: start a session, add an exercise you've logged before — confirm the "Last time: ..." caption appears. Add a second exercise sharing a muscle group with the first — confirm the "Already trained today: ..." badge appears.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/session-detail.tsx apps/web/src/lib/i18n/dictionaries/en.ts apps/web/src/lib/i18n/dictionaries/pl.ts
git commit -m "feat(web): show last-time performance and same-session muscle fatigue when logging an exercise"
```

---

### Task 11: Switch the plan editor to the catalog picker

**Files:**
- Modify: `apps/web/src/components/plan-detail.tsx`
- Modify: `apps/web/src/lib/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/lib/i18n/dictionaries/pl.ts`

**Interfaces:**
- Consumes: `ExercisePicker` (Task 9).
- Produces: plan exercises are added/edited via catalog id; exercise identity can no longer be changed in place (remove + re-add instead) — sets/reps/weight remain editable in place.

- [ ] **Step 1: Remove the now-unused `exerciseNamePlaceholder` string**

In `apps/web/src/lib/i18n/dictionaries/en.ts`, remove the line from `planDetail`:

```ts
    exerciseNamePlaceholder: 'Bench Press',
```

In `apps/web/src/lib/i18n/dictionaries/pl.ts`, remove the matching line:

```ts
    exerciseNamePlaceholder: 'Wyciskanie sztangi',
```

- [ ] **Step 2: Rewrite `plan-detail.tsx`**

Replace the full contents of `apps/web/src/components/plan-detail.tsx`:

```tsx
'use client';

import type {
  Exercise,
  UpdateWorkoutExerciseInput,
  WorkoutExercise,
  WorkoutPlanWithExercises,
} from '@acme/contracts';
import { updateWorkoutPlanInputSchema } from '@acme/contracts';
import { Button, Card, Input, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ConfirmButton } from '@/components/confirm-button';
import { ExercisePicker } from '@/components/exercise-picker';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';

type PlanFormValues = z.infer<typeof updateWorkoutPlanInputSchema>;

export function PlanDetail({ plan }: { plan: WorkoutPlanWithExercises }) {
  const router = useRouter();
  const { dict } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(updateWorkoutPlanInputSchema),
    defaultValues: { name: plan.name, notes: plan.notes ?? '' },
  });

  const updatePlan = useMutation({
    mutationFn: async (values: PlanFormValues) => {
      const result = await apiClient.workouts.updatePlan({ params: { id: plan.id }, body: values });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => router.refresh(),
  });

  const removePlan = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removePlan({ params: { id: plan.id } });
      if (result.status !== 204) throw new Error(result.body.message);
    },
    onSuccess: () => router.push('/plans'),
  });

  return (
    <Stack gap="lg">
      <Stack direction="row" justify="between" align="center">
        <Text variant="heading">{plan.name}</Text>
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={dict.planDetail.deletePlanTitle}
          description={dict.planDetail.deletePlanDescription(plan.name)}
          pending={removePlan.isPending}
          onConfirm={() => removePlan.mutate()}
        >
          {dict.planDetail.deletePlan}
        </ConfirmButton>
      </Stack>

      <Card>
        <form onSubmit={planForm.handleSubmit((values) => updatePlan.mutate(values))}>
          <Stack gap="sm">
            <Stack gap="xs">
              <Text variant="caption">{dict.common.name}</Text>
              <Input {...planForm.register('name')} />
              {planForm.formState.errors.name && (
                <Text variant="caption" tone="destructive">
                  {planForm.formState.errors.name.message}
                </Text>
              )}
            </Stack>
            <Stack gap="xs">
              <Text variant="caption">{dict.planDetail.notes}</Text>
              <textarea
                className="border-border bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none"
                rows={2}
                {...planForm.register('notes')}
              />
            </Stack>
            <Stack direction="row" gap="sm" align="center">
              <Button type="submit" size="sm" disabled={updatePlan.isPending}>
                {updatePlan.isPending ? dict.common.saving : dict.common.save}
              </Button>
              {updatePlan.isError && (
                <Text variant="caption" tone="destructive">
                  {updatePlan.error.message}
                </Text>
              )}
            </Stack>
          </Stack>
        </form>
      </Card>

      <Card>
        <Text variant="subheading" className="mb-3 block">
          {dict.planDetail.exercisesHeading}
        </Text>
        {plan.exercises.length === 0 ? (
          <Text tone="muted">{dict.planDetail.noExercises}</Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.common.name}</TableHead>
                <TableHead>{dict.common.sets}</TableHead>
                <TableHead>{dict.common.reps}</TableHead>
                <TableHead>{dict.common.weightKg}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.exercises.map((exercise) =>
                editingId === exercise.id ? (
                  <ExerciseEditRow
                    key={exercise.id}
                    planId={plan.id}
                    exercise={exercise}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ExerciseRow
                    key={exercise.id}
                    planId={plan.id}
                    exercise={exercise}
                    onEdit={() => setEditingId(exercise.id)}
                    onRemoved={() => router.refresh()}
                  />
                ),
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <AddPlanExerciseCard planId={plan.id} onAdded={() => router.refresh()} />
    </Stack>
  );
}

function AddPlanExerciseCard({ planId, onAdded }: { planId: string; onAdded: () => void }) {
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
    <Card>
      <Text variant="subheading" className="mb-3 block">
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
            <Button type="button" disabled={addExercise.isPending} onClick={() => addExercise.mutate()}>
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

function ExerciseRow({
  planId,
  exercise,
  onEdit,
  onRemoved,
}: {
  planId: string;
  exercise: WorkoutExercise;
  onEdit: () => void;
  onRemoved: () => void;
}) {
  const { dict } = useLocale();
  const removeExercise = useMutation({
    mutationFn: async () => {
      const result = await apiClient.workouts.removeExercise({
        params: { planId, exerciseId: exercise.id },
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
        <Stack direction="row" gap="xs">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {dict.common.edit}
          </Button>
          <ConfirmButton
            variant="ghost"
            size="sm"
            title={dict.planDetail.removeExerciseTitle}
            description={dict.planDetail.removeExerciseDescription(exercise.exercise.name)}
            pending={removeExercise.isPending}
            onConfirm={() => removeExercise.mutate()}
          >
            {dict.common.remove}
          </ConfirmButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function ExerciseEditRow({
  planId,
  exercise,
  onDone,
  onCancel,
}: {
  planId: string;
  exercise: WorkoutExercise;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { dict } = useLocale();
  const { register, handleSubmit } = useForm<UpdateWorkoutExerciseInput>({
    defaultValues: {
      sets: exercise.sets,
      reps: exercise.reps,
      weightKg: exercise.weightKg,
    },
  });

  const updateExercise = useMutation({
    mutationFn: async (values: UpdateWorkoutExerciseInput) => {
      const result = await apiClient.workouts.updateExercise({
        params: { planId, exerciseId: exercise.id },
        body: values,
      });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: onDone,
  });

  return (
    <TableRow>
      <TableCell colSpan={5}>
        <form
          onSubmit={handleSubmit((values) => updateExercise.mutate(values))}
          className="flex flex-wrap items-center gap-2"
        >
          <Text className="font-medium">{exercise.exercise.name}</Text>
          <Input className="w-16" type="number" {...register('sets', { valueAsNumber: true })} />
          <Input className="w-16" type="number" {...register('reps', { valueAsNumber: true })} />
          <Input
            className="w-20"
            type="number"
            step="0.5"
            {...register('weightKg', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
          <Button type="submit" size="sm" disabled={updateExercise.isPending}>
            {dict.common.save}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {dict.common.cancel}
          </Button>
        </form>
        {updateExercise.isError && (
          <Text variant="caption" tone="destructive" className="mt-1 block">
            {updateExercise.error.message}
          </Text>
        )}
      </TableCell>
    </TableRow>
  );
}
```

(Note: `exercise-library.ts` is no longer imported here — it's still used by `equipment-icon.tsx`, so don't delete the file.)

- [ ] **Step 3: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

Manually: open a plan, add an exercise via the catalog picker, edit its sets/reps/weight, remove it. Confirm the table shows the catalog exercise's name.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/plan-detail.tsx apps/web/src/lib/i18n/dictionaries/en.ts apps/web/src/lib/i18n/dictionaries/pl.ts
git commit -m "feat(web): switch plan exercise editor to the catalog picker"
```

---

### Task 12: Pre-fill a started plan with last actual performance, link the session to the plan

**Files:**
- Modify: `apps/web/src/components/start-plan-button.tsx`
- Modify: `apps/web/src/components/workout-template-detail.tsx`

**Interfaces:**
- Consumes: `apiClient.training.lastPerformance` (Task 7), `apiClient.training.createSession` now accepting `planId` (Task 7).

- [ ] **Step 1: Rewrite `start-plan-button.tsx`**

Replace the full contents of `apps/web/src/components/start-plan-button.tsx`. This also removes the old catalog-name-matching workaround (and its silent-skip bug) entirely, since `plan.exercises[].exercise.id` is now a real catalog id:

```tsx
'use client';

import { Button } from '@acme/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/context';
import { toLocalIsoDate } from '@/lib/training-colors';

export function StartPlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const { dict } = useLocale();

  const mutation = useMutation({
    mutationFn: async () => {
      const planResult = await apiClient.workouts.getPlan({ params: { id: planId } });
      if (planResult.status !== 200) throw new Error(planResult.body.message);
      const plan = planResult.body;

      const lastPerformanceByExerciseId = new Map<
        string,
        { sets: number; reps: number; weightKg: number | null }
      >();
      if (plan.exercises.length > 0) {
        const lastPerformanceResult = await apiClient.training.lastPerformance({
          query: { exerciseIds: plan.exercises.map((exercise) => exercise.exercise.id).join(',') },
        });
        if (lastPerformanceResult.status === 200) {
          for (const entry of lastPerformanceResult.body) {
            lastPerformanceByExerciseId.set(entry.exerciseId, entry);
          }
        }
      }

      const sessionResult = await apiClient.training.createSession({
        body: { date: toLocalIsoDate(new Date()), type: plan.category ?? 'strength', planId: plan.id },
      });
      if (sessionResult.status !== 201) throw new Error(sessionResult.body.message);
      const session = sessionResult.body;

      await Promise.all(
        plan.exercises.map((exercise) => {
          const last = lastPerformanceByExerciseId.get(exercise.exercise.id);
          return apiClient.training.addSessionExercise({
            params: { sessionId: session.id },
            body: {
              exerciseId: exercise.exercise.id,
              sets: last?.sets ?? exercise.sets,
              reps: last?.reps ?? exercise.reps,
              weightKg: (last?.weightKg ?? exercise.weightKg) ?? undefined,
            },
          });
        }),
      );

      return session;
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

- [ ] **Step 2: Fix the plan-exercise name reference in the template detail page**

In `apps/web/src/components/workout-template-detail.tsx`, change line 102:

```tsx
                    <Text className="font-display text-lg uppercase">{exercise.name}</Text>
```

to:

```tsx
                    <Text className="font-display text-lg uppercase">{exercise.exercise.name}</Text>
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

Manually: log a training session with a specific weight for an exercise that's also on one of your plans. Start that plan again — confirm the pre-filled weight matches what you actually logged, not the plan's stored default.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/start-plan-button.tsx apps/web/src/components/workout-template-detail.tsx
git commit -m "feat(web): pre-fill started plans with last actual performance, link session to plan"
```

---

### Task 13: Full workspace verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck and build everything touched**

Run: `pnpm --filter @acme/db --filter @acme/contracts --filter @acme/api --filter @acme/web --filter @acme/api-client typecheck`
Expected: all pass.

Run: `pnpm --filter @acme/db --filter @acme/contracts --filter @acme/api-client build`
Expected: all pass (rebuilds the packages `apps/web`/`apps/api` import types from).

- [ ] **Step 2: Run every test suite touched**

Run: `pnpm --filter @acme/api test && pnpm --filter @acme/web test`
Expected: all pass, including the new `training.service.spec.ts` and `muscle-fatigue.test.ts`.

- [ ] **Step 3: Lint everything touched**

Run: `pnpm --filter @acme/db --filter @acme/contracts --filter @acme/api --filter @acme/web lint`
Expected: passes with no unused-import or formatting errors.

- [ ] **Step 4: Manual smoke test**

Start the API and web dev servers, then walk through:
1. Log in.
2. Open a plan (e.g. the seeded "Push Day" template — fork it first if you only have templates), add an ad hoc exercise via the catalog picker, edit its sets, remove it.
3. From Tracking, start that plan — confirm it creates a session and takes you to it.
4. In the active session, add an ad hoc exercise you've logged with that exercise before — confirm the "Last time: ..." caption shows.
5. Add a second ad hoc exercise sharing a muscle group with one already logged in this session — confirm the "Already trained today: ..." badge shows.
6. Finish the session, start the same plan again — confirm exercises pre-fill with what you just logged, not the plan's original stored defaults.

- [ ] **Step 5: Report status**

If every check above passes, the feature is complete and this plan can be closed out. If anything fails, fix it in the task where it belongs (don't patch it here) and re-run the relevant verification step.
