# Per-Set Training Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bundled "N sets of the same reps/weight" logging model with individually editable physical sets, grouped under a per-exercise card that also carries a free-text note and the existing rest-time default — turning the tracker page into a genuinely editable workout notepad.

**Architecture:** Split `training_session_exercises` (now a pure exercise-group: which exercise, notes, rest default) from a new `training_session_sets` table (one row per physical set: reps, weight). A hand-written data migration backfills existing bundled rows into individual set rows before the old columns are dropped. The frontend collapses the previous "add form + separate summary list" split into one card per logged exercise showing every set as an inline-editable row, plus its own "add another set" mini-form.

**Tech Stack:** Drizzle ORM + drizzle-kit (Postgres), ts-rest contracts (Zod), NestJS (repository/service/controller), Next.js + TanStack Query, Vitest.

## Global Constraints

- No new database table beyond `training_session_sets` — spec says no per-set notes, no drag-reorder, no change to workout plan templates (`workout_exercises` and everything under `plan-detail.tsx`/`workout-template-detail.tsx`/`template-library.tsx` are untouched).
- The data migration must be lossless for what old rows actually recorded (`sets` identical child rows per old bundled entry) — no reconstruction of variance that was never captured.
- Per-set delete is a plain instant button, no confirmation dialog (low-stakes, frequent action) — exercise-level and session-level delete keep their existing `ConfirmButton` confirmation.
- Also fold in the already-diagnosed, already-fixed `apps/web/src/components/session-detail.tsx` bug (the per-exercise `last-performance` query returning `undefined` instead of `null`, which crashes React Query) into this plan's first frontend commit — it's already fixed in the working tree, just uncommitted.

---

### Task 1: Add `training_session_sets` table + `notes` column (keep old columns for now)

**Files:**
- Modify: `packages/db/src/schema/training.ts`

**Interfaces:**
- Produces: `trainingSessionSets` table (Drizzle), `TrainingSessionSetRow`, `NewTrainingSessionSetRow` types. `trainingSessionExercises.notes` column. Old `sets`/`reps`/`weightKg` columns on `trainingSessionExercises` still present (dropped in Task 3, after the data migration in Task 2 has copied them out).

- [ ] **Step 1: Edit the schema file**

Current `packages/db/src/schema/training.ts` in full:

```ts
import { relations } from 'drizzle-orm';
import { date, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { exercises } from './exercises.js';
import { trainingTypes } from './training-types.js';
import { workoutPlans } from './workouts.js';

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
    // Set once, when the session is finished. Null means the session was
    // never timed (created directly, or timing was lost/not started).
    durationSeconds: integer('duration_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('training_sessions_userId_date_idx').on(table.userId, table.date)],
);

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

export const trainingSessionRelations = relations(trainingSessions, ({ many }) => ({
  exercises: many(trainingSessionExercises),
}));

export const trainingSessionExerciseRelations = relations(trainingSessionExercises, ({ one }) => ({
  session: one(trainingSessions, {
    fields: [trainingSessionExercises.sessionId],
    references: [trainingSessions.id],
  }),
  exercise: one(exercises, {
    fields: [trainingSessionExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export type TrainingSessionRow = typeof trainingSessions.$inferSelect;
export type NewTrainingSessionRow = typeof trainingSessions.$inferInsert;
export type TrainingSessionExerciseRow = typeof trainingSessionExercises.$inferSelect;
export type NewTrainingSessionExerciseRow = typeof trainingSessionExercises.$inferInsert;
```

Replace the whole file with:

```ts
import { relations } from 'drizzle-orm';
import { date, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { exercises } from './exercises.js';
import { trainingTypes } from './training-types.js';
import { workoutPlans } from './workouts.js';

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
    // Set once, when the session is finished. Null means the session was
    // never timed (created directly, or timing was lost/not started).
    durationSeconds: integer('duration_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('training_sessions_userId_date_idx').on(table.userId, table.date)],
);

// A logged exercise "group" within a session — which exercise, an optional
// note, and the rest-time default. The physical sets live in
// `trainingSessionSets`, not here (see below): a bench press entry might
// be 50kg×5, 50kg×4, 60kg×5, each independently editable.
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
    // Legacy bundled fields — still present so the Task 2 data migration
    // has a source to copy from. Dropped in Task 3 once that's done.
    sets: integer('sets').notNull(),
    reps: integer('reps').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
    notes: text('notes'),
    // Rest taken after a set of this exercise. Null until a rest period
    // ends (skip, or a manual +15s/edit adjustment); reused as the default
    // rest duration the next time this exercise is logged.
    restSeconds: integer('rest_seconds'),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('training_session_exercises_sessionId_idx').on(table.sessionId)],
);

export const trainingSessionSets = pgTable(
  'training_session_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionExerciseId: uuid('session_exercise_id')
      .notNull()
      .references(() => trainingSessionExercises.id, { onDelete: 'cascade' }),
    reps: integer('reps').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('training_session_sets_sessionExerciseId_idx').on(table.sessionExerciseId)],
);

export const trainingSessionRelations = relations(trainingSessions, ({ many }) => ({
  exercises: many(trainingSessionExercises),
}));

export const trainingSessionExerciseRelations = relations(
  trainingSessionExercises,
  ({ one, many }) => ({
    session: one(trainingSessions, {
      fields: [trainingSessionExercises.sessionId],
      references: [trainingSessions.id],
    }),
    exercise: one(exercises, {
      fields: [trainingSessionExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(trainingSessionSets),
  }),
);

export const trainingSessionSetRelations = relations(trainingSessionSets, ({ one }) => ({
  sessionExercise: one(trainingSessionExercises, {
    fields: [trainingSessionSets.sessionExerciseId],
    references: [trainingSessionExercises.id],
  }),
}));

export type TrainingSessionRow = typeof trainingSessions.$inferSelect;
export type NewTrainingSessionRow = typeof trainingSessions.$inferInsert;
export type TrainingSessionExerciseRow = typeof trainingSessionExercises.$inferSelect;
export type NewTrainingSessionExerciseRow = typeof trainingSessionExercises.$inferInsert;
export type TrainingSessionSetRow = typeof trainingSessionSets.$inferSelect;
export type NewTrainingSessionSetRow = typeof trainingSessionSets.$inferInsert;
```

- [ ] **Step 2: Generate the migration**

```bash
pnpm db:generate
```

Expected: a new file `packages/db/drizzle/0009_<random_name>.sql` containing a `CREATE TABLE "training_session_sets" (...)` with its FK/index, and `ALTER TABLE "training_session_exercises" ADD COLUMN "notes" text;`. Confirm it does **not** touch `sets`/`reps`/`weight_kg` on `training_session_exercises` (those stay for Task 2).

- [ ] **Step 3: Apply and verify**

```bash
pnpm db:migrate
pnpm --filter @acme/db build
```

Expected: `Migrations complete.`, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/training.ts packages/db/drizzle/
git commit -m "feat(db): add training_session_sets and exercise notes"
```

---

### Task 2: Data migration — backfill sets from the bundled columns

**Files:**
- Create: `packages/db/drizzle/00XX_backfill_training_session_sets.sql` (via `drizzle-kit generate --custom`, filled in by hand)

**Interfaces:** none (pure data transform, no schema/type change).

- [ ] **Step 1: Create an empty custom migration**

```bash
pnpm --filter @acme/db exec drizzle-kit generate --custom --name=backfill_training_session_sets
```

Expected: a new empty file `packages/db/drizzle/00XX_backfill_training_session_sets.sql` and a matching entry appended to `packages/db/drizzle/meta/_journal.json` — no snapshot diff, since the schema didn't change since Task 1.

- [ ] **Step 2: Fill in the backfill SQL**

Replace that empty file's contents with:

```sql
INSERT INTO training_session_sets (session_exercise_id, reps, weight_kg, position)
SELECT id, reps, weight_kg, generate_series(0, sets - 1)
FROM training_session_exercises;
```

Each old bundled row becomes `sets` identical child rows (same `reps`/`weight_kg`), positioned `0..sets-1` — this is the only faithful expansion of what the old data recorded.

- [ ] **Step 3: Apply and verify with a direct-Postgres probe**

```bash
pnpm db:migrate
```

Expected: `Migrations complete.`

Then, from `packages/db/`, write a throwaway probe script to confirm the backfill on real data (skip this step if `training_session_exercises` is currently empty in the local dev DB — check with a quick `select count(*) from training_session_exercises;` via `psql` or the `db:studio` script first):

```ts
// packages/db/scratch-backfill-probe.ts
import './src/load-env.js';
import { eq } from 'drizzle-orm';
import { db } from './src/client.js';
import { trainingSessionExercises, trainingSessionSets } from './src/schema/index.js';

async function main() {
  const groups = await db.select().from(trainingSessionExercises);
  for (const group of groups) {
    const sets = await db
      .select()
      .from(trainingSessionSets)
      .where(eq(trainingSessionSets.sessionExerciseId, group.id));
    console.log(
      `group ${group.id}: expected ${group.sets} sets, found ${sets.length}`,
      sets.map((s) => `${s.reps}x${s.weightKg ?? 'bw'}`),
    );
    if (sets.length !== group.sets) throw new Error(`Mismatch for group ${group.id}`);
  }
  console.log(`Checked ${groups.length} groups, all matched.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

```bash
pnpm exec tsx scratch-backfill-probe.ts
rm scratch-backfill-probe.ts
```

Expected: every group's expected/found set count matches (or "Checked 0 groups" if the dev DB has no logged exercises yet — still fine, just means there was nothing to verify against).

- [ ] **Step 4: Commit**

```bash
git add packages/db/drizzle/
git commit -m "feat(db): backfill training_session_sets from bundled columns"
```

---

### Task 3: Drop the bundled columns

**Files:**
- Modify: `packages/db/src/schema/training.ts`

- [ ] **Step 1: Remove the legacy fields**

In `trainingSessionExercises`, delete these three lines (and their comment):

```ts
    // Legacy bundled fields — still present so the Task 2 data migration
    // has a source to copy from. Dropped in Task 3 once that's done.
    sets: integer('sets').notNull(),
    reps: integer('reps').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
```

- [ ] **Step 2: Generate, apply, verify**

```bash
pnpm db:generate
```

Expected: a new migration with `ALTER TABLE "training_session_exercises" DROP COLUMN "sets", DROP COLUMN "reps", DROP COLUMN "weight_kg";` (drizzle-kit may emit three separate `DROP COLUMN` statements or one combined `ALTER TABLE` — either is fine).

```bash
pnpm db:migrate
pnpm --filter @acme/db build
```

Expected: `Migrations complete.`, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/training.ts packages/db/drizzle/
git commit -m "feat(db): drop bundled sets/reps/weightKg from training_session_exercises"
```

---

### Task 4: Contracts — schemas and endpoints

**Files:**
- Modify: `packages/contracts/src/schemas/training.schema.ts`
- Modify: `packages/contracts/src/contracts/training.contract.ts`

**Interfaces:**
- Produces:
  - `TrainingSessionSet = { id, sessionExerciseId, reps, weightKg, position, createdAt, updatedAt }`
  - `TrainingSessionExercise` gains `notes: string | null` and `sets: TrainingSessionSet[]`; loses `sets`/`reps`/`weightKg` as scalars.
  - `AddTrainingSessionExerciseInput = { exerciseId, reps, weightKg? }` (no more `sets` count).
  - `UpdateTrainingSessionSetInput = { reps, weightKg: number | null }`.
  - `UpdateSessionExerciseNotesInput = { notes: string | null }`.
  - `TrainingSessionSetParams = { sessionId, exerciseId, setId }`.
  - `LastPerformanceEntry` loses `sets`; becomes `{ exerciseId, reps, weightKg, restSeconds, date }` describing the most recent individual set.
  - `contract.training.updateSessionSet`, `contract.training.removeSessionSet`, `contract.training.updateSessionExerciseNotes`.

- [ ] **Step 1: Rewrite `training.schema.ts`**

Current file in full (for reference — every symbol below is being replaced):

```ts
import { z } from 'zod';
import { exerciseSchema } from './exercise.schema.js';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const trainingTypeSchema = z.enum(['strength', 'cardio', 'mobility', 'rest']);
export type TrainingTypeValue = z.infer<typeof trainingTypeSchema>;

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

export const addTrainingSessionExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type AddTrainingSessionExerciseInput = z.infer<typeof addTrainingSessionExerciseInputSchema>;

export const updateSessionExerciseRestInputSchema = z.object({
  restSeconds: z.number().int().min(0),
});
export type UpdateSessionExerciseRestInput = z.infer<typeof updateSessionExerciseRestInputSchema>;

export const trainingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  planId: z.string().uuid().nullable(),
  date: z.string(),
  type: trainingTypeSchema,
  notes: z.string().nullable(),
  durationSeconds: z.number().int().min(0).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSession = z.infer<typeof trainingSessionSchema>;

export const trainingSessionWithExercisesSchema = trainingSessionSchema.extend({
  exercises: z.array(trainingSessionExerciseSchema),
});
export type TrainingSessionWithExercises = z.infer<typeof trainingSessionWithExercisesSchema>;

export const createTrainingSessionInputSchema = z.object({
  date: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
  type: trainingTypeSchema,
  notes: z.string().max(2000).nullable().optional(),
  planId: z.string().uuid().nullable().optional(),
});
export type CreateTrainingSessionInput = z.infer<typeof createTrainingSessionInputSchema>;

export const finishTrainingSessionInputSchema = z.object({
  durationSeconds: z.number().int().min(0),
});
export type FinishTrainingSessionInput = z.infer<typeof finishTrainingSessionInputSchema>;

export const listTrainingSessionsQuerySchema = z.object({
  from: z.string().regex(isoDatePattern).optional(),
  to: z.string().regex(isoDatePattern).optional(),
});
export type ListTrainingSessionsQuery = z.infer<typeof listTrainingSessionsQuerySchema>;

export const trainingSessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type TrainingSessionIdParams = z.infer<typeof trainingSessionIdParamsSchema>;

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
});
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;

export const trainingSessionExerciseParamsSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});
export type TrainingSessionExerciseParams = z.infer<typeof trainingSessionExerciseParamsSchema>;

export const lastPerformanceEntrySchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  restSeconds: z.number().int().min(0).nullable(),
  date: z.string(),
});
export type LastPerformanceEntry = z.infer<typeof lastPerformanceEntrySchema>;

export const lastPerformanceQuerySchema = z.object({
  // Comma-separated exercise ids, e.g. "id-1,id-2".
  exerciseIds: z.string().min(1),
});
export type LastPerformanceQuery = z.infer<typeof lastPerformanceQuerySchema>;
```

Replace the whole file with:

```ts
import { z } from 'zod';
import { exerciseSchema } from './exercise.schema.js';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const trainingTypeSchema = z.enum(['strength', 'cardio', 'mobility', 'rest']);
export type TrainingTypeValue = z.infer<typeof trainingTypeSchema>;

export const trainingSessionSetSchema = z.object({
  id: z.string().uuid(),
  sessionExerciseId: z.string().uuid(),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  position: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSessionSet = z.infer<typeof trainingSessionSetSchema>;

export const trainingSessionExerciseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exercise: exerciseSchema,
  notes: z.string().max(2000).nullable(),
  restSeconds: z.number().int().min(0).nullable(),
  position: z.number().int().min(0),
  sets: z.array(trainingSessionSetSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSessionExercise = z.infer<typeof trainingSessionExerciseSchema>;

export const addTrainingSessionExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});
export type AddTrainingSessionExerciseInput = z.infer<typeof addTrainingSessionExerciseInputSchema>;

export const updateTrainingSessionSetInputSchema = z.object({
  reps: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).nullable(),
});
export type UpdateTrainingSessionSetInput = z.infer<typeof updateTrainingSessionSetInputSchema>;

export const updateSessionExerciseNotesInputSchema = z.object({
  notes: z.string().max(2000).nullable(),
});
export type UpdateSessionExerciseNotesInput = z.infer<typeof updateSessionExerciseNotesInputSchema>;

export const updateSessionExerciseRestInputSchema = z.object({
  restSeconds: z.number().int().min(0),
});
export type UpdateSessionExerciseRestInput = z.infer<typeof updateSessionExerciseRestInputSchema>;

export const trainingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  planId: z.string().uuid().nullable(),
  date: z.string(),
  type: trainingTypeSchema,
  notes: z.string().nullable(),
  durationSeconds: z.number().int().min(0).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrainingSession = z.infer<typeof trainingSessionSchema>;

export const trainingSessionWithExercisesSchema = trainingSessionSchema.extend({
  exercises: z.array(trainingSessionExerciseSchema),
});
export type TrainingSessionWithExercises = z.infer<typeof trainingSessionWithExercisesSchema>;

export const createTrainingSessionInputSchema = z.object({
  date: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
  type: trainingTypeSchema,
  notes: z.string().max(2000).nullable().optional(),
  planId: z.string().uuid().nullable().optional(),
});
export type CreateTrainingSessionInput = z.infer<typeof createTrainingSessionInputSchema>;

export const finishTrainingSessionInputSchema = z.object({
  durationSeconds: z.number().int().min(0),
});
export type FinishTrainingSessionInput = z.infer<typeof finishTrainingSessionInputSchema>;

export const listTrainingSessionsQuerySchema = z.object({
  from: z.string().regex(isoDatePattern).optional(),
  to: z.string().regex(isoDatePattern).optional(),
});
export type ListTrainingSessionsQuery = z.infer<typeof listTrainingSessionsQuerySchema>;

export const trainingSessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type TrainingSessionIdParams = z.infer<typeof trainingSessionIdParamsSchema>;

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
});
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;

export const trainingSessionExerciseParamsSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});
export type TrainingSessionExerciseParams = z.infer<typeof trainingSessionExerciseParamsSchema>;

export const trainingSessionSetParamsSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setId: z.string().uuid(),
});
export type TrainingSessionSetParams = z.infer<typeof trainingSessionSetParamsSchema>;

export const lastPerformanceEntrySchema = z.object({
  exerciseId: z.string().uuid(),
  reps: z.number().int().min(1).max(500),
  weightKg: z.coerce.number().min(0).max(1000).nullable(),
  restSeconds: z.number().int().min(0).nullable(),
  date: z.string(),
});
export type LastPerformanceEntry = z.infer<typeof lastPerformanceEntrySchema>;

export const lastPerformanceQuerySchema = z.object({
  // Comma-separated exercise ids, e.g. "id-1,id-2".
  exerciseIds: z.string().min(1),
});
export type LastPerformanceQuery = z.infer<typeof lastPerformanceQuerySchema>;
```

- [ ] **Step 2: Rewrite `training.contract.ts`**

Current file in full:

```ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
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
    method: 'GET',
    path: '/training-sessions/:id',
    pathParams: trainingSessionIdParamsSchema,
    responses: {
      200: trainingSessionWithExercisesSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a training session with its exercises',
  },
  createSession: {
    method: 'POST',
    path: '/training-sessions',
    body: createTrainingSessionInputSchema,
    responses: { 201: trainingSessionSchema, 401: errorResponseSchema },
    summary: 'Log a new training session',
  },
  removeSession: {
    method: 'DELETE',
    path: '/training-sessions/:id',
    pathParams: trainingSessionIdParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Delete a training session',
  },
  finishSession: {
    method: 'PATCH',
    path: '/training-sessions/:id/finish',
    pathParams: trainingSessionIdParamsSchema,
    body: finishTrainingSessionInputSchema,
    responses: {
      200: trainingSessionSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Mark a training session finished and record how long it took',
  },
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
    method: 'DELETE',
    path: '/training-sessions/:sessionId/exercises/:exerciseId',
    pathParams: trainingSessionExerciseParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Remove an exercise from a training session',
  },
});
```

Replace the whole file with:

```ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
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
  trainingSessionSetParamsSchema,
  trainingSessionWithExercisesSchema,
  updateSessionExerciseNotesInputSchema,
  updateSessionExerciseRestInputSchema,
  updateTrainingSessionSetInputSchema,
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
    summary: "Get the current user's most recently logged set per exercise",
  },
  getSession: {
    method: 'GET',
    path: '/training-sessions/:id',
    pathParams: trainingSessionIdParamsSchema,
    responses: {
      200: trainingSessionWithExercisesSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a training session with its exercises and their sets',
  },
  createSession: {
    method: 'POST',
    path: '/training-sessions',
    body: createTrainingSessionInputSchema,
    responses: { 201: trainingSessionSchema, 401: errorResponseSchema },
    summary: 'Log a new training session',
  },
  removeSession: {
    method: 'DELETE',
    path: '/training-sessions/:id',
    pathParams: trainingSessionIdParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Delete a training session',
  },
  finishSession: {
    method: 'PATCH',
    path: '/training-sessions/:id/finish',
    pathParams: trainingSessionIdParamsSchema,
    body: finishTrainingSessionInputSchema,
    responses: {
      200: trainingSessionSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Mark a training session finished and record how long it took',
  },
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
    summary:
      'Log a set for an exercise in a training session (creates the exercise entry on first use)',
  },
  updateSessionSet: {
    method: 'PATCH',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/sets/:setId',
    pathParams: trainingSessionSetParamsSchema,
    body: updateTrainingSessionSetInputSchema,
    responses: {
      200: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update a single logged set',
  },
  removeSessionSet: {
    method: 'DELETE',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/sets/:setId',
    pathParams: trainingSessionSetParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Remove a single logged set (removes the exercise entry too if it was the last set)',
  },
  updateSessionExerciseNotes: {
    method: 'PATCH',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/notes',
    pathParams: trainingSessionExerciseParamsSchema,
    body: updateSessionExerciseNotesInputSchema,
    responses: {
      200: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update the note attached to a logged exercise',
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
    method: 'DELETE',
    path: '/training-sessions/:sessionId/exercises/:exerciseId',
    pathParams: trainingSessionExerciseParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Remove an exercise (and all its sets) from a training session',
  },
});
```

- [ ] **Step 3: Build and verify**

```bash
pnpm --filter @acme/contracts build
grep -n "updateSessionSet\|removeSessionSet\|updateSessionExerciseNotes" packages/contracts/dist/index.d.ts
```

Expected: build succeeds, grep finds all three new endpoint names.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/
git commit -m "feat(contracts): split sets out of trainingSessionExercise"
```

---

### Task 5: Backend — repository

**Files:**
- Modify: `apps/api/src/modules/training/training.repository.ts`

**Interfaces:**
- Consumes: `trainingSessionSets`, `TrainingSessionSetRow`, `NewTrainingSessionSetRow` from `@acme/db` (Task 1).
- Produces (new/changed repository methods, consumed by Task 6's service):
  - `findGroupByExercise(sessionId, exerciseId): Promise<TrainingSessionExerciseRow | undefined>`
  - `createExerciseGroup(input: { sessionId, exerciseId, position }): Promise<TrainingSessionExerciseRow>`
  - `nextSetPosition(sessionExerciseId): Promise<number>`
  - `addSet(input: { sessionExerciseId, reps, weightKg, position }): Promise<TrainingSessionSetRow>`
  - `updateSet(setId, sessionExerciseId, input: { reps, weightKg }): Promise<boolean>`
  - `removeSet(setId, sessionExerciseId): Promise<boolean>`
  - `hasRemainingSets(sessionExerciseId): Promise<boolean>`
  - `updateExerciseNotes(id, sessionId, notes): Promise<boolean>`
  - `listSessionExercises`/`findSessionExerciseById` now return `TrainingSessionExerciseWithExercise` including a `sets: TrainingSessionSetRow[]` field.
  - `lastPerformanceByExerciseIds` return type drops `sets`, queries `trainingSessionSets`.
  - `addExercise` (the old bundled-insert method) is **removed** — replaced by `createExerciseGroup` + `addSet`, orchestrated in the service.

- [ ] **Step 1: Rewrite the whole file**

Current file in full (for reference):

```ts
import type {
  Database,
  ExerciseRow,
  NewTrainingSessionExerciseRow,
  NewTrainingSessionRow,
  TrainingSessionExerciseRow,
  TrainingSessionRow,
} from '@acme/db';
import { exercises, trainingSessionExercises, trainingSessions } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, max } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

export type TrainingSessionExerciseWithExercise = TrainingSessionExerciseRow & {
  exercise: ExerciseRow;
};

@Injectable()
export class TrainingRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listSessions(userId: string, from?: string, to?: string): Promise<TrainingSessionRow[]> {
    const conditions = [eq(trainingSessions.userId, userId)];
    if (from) conditions.push(gte(trainingSessions.date, from));
    if (to) conditions.push(lte(trainingSessions.date, to));

    return this.db
      .select()
      .from(trainingSessions)
      .where(and(...conditions))
      .orderBy(asc(trainingSessions.date));
  }

  async findSessionById(id: string, userId: string): Promise<TrainingSessionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .limit(1);
    return row;
  }

  async createSession(
    input: Pick<NewTrainingSessionRow, 'userId' | 'planId' | 'date' | 'type' | 'notes'>,
  ): Promise<TrainingSessionRow> {
    const [row] = await this.db.insert(trainingSessions).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async finishSession(
    id: string,
    userId: string,
    durationSeconds: number,
  ): Promise<TrainingSessionRow | undefined> {
    const [row] = await this.db
      .update(trainingSessions)
      .set({ durationSeconds, updatedAt: new Date() })
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .returning();
    return row;
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(trainingSessions)
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .returning({ id: trainingSessions.id });
    return deleted.length > 0;
  }

  async listSessionExercises(sessionId: string): Promise<TrainingSessionExerciseWithExercise[]> {
    return this.db
      .select({
        id: trainingSessionExercises.id,
        sessionId: trainingSessionExercises.sessionId,
        exerciseId: trainingSessionExercises.exerciseId,
        sets: trainingSessionExercises.sets,
        reps: trainingSessionExercises.reps,
        weightKg: trainingSessionExercises.weightKg,
        restSeconds: trainingSessionExercises.restSeconds,
        position: trainingSessionExercises.position,
        createdAt: trainingSessionExercises.createdAt,
        updatedAt: trainingSessionExercises.updatedAt,
        exercise: exercises,
      })
      .from(trainingSessionExercises)
      .innerJoin(exercises, eq(exercises.id, trainingSessionExercises.exerciseId))
      .where(eq(trainingSessionExercises.sessionId, sessionId))
      .orderBy(asc(trainingSessionExercises.position));
  }

  async findSessionExerciseById(
    id: string,
    sessionId: string,
  ): Promise<TrainingSessionExerciseWithExercise | undefined> {
    const [row] = await this.db
      .select({
        id: trainingSessionExercises.id,
        sessionId: trainingSessionExercises.sessionId,
        exerciseId: trainingSessionExercises.exerciseId,
        sets: trainingSessionExercises.sets,
        reps: trainingSessionExercises.reps,
        weightKg: trainingSessionExercises.weightKg,
        restSeconds: trainingSessionExercises.restSeconds,
        position: trainingSessionExercises.position,
        createdAt: trainingSessionExercises.createdAt,
        updatedAt: trainingSessionExercises.updatedAt,
        exercise: exercises,
      })
      .from(trainingSessionExercises)
      .innerJoin(exercises, eq(exercises.id, trainingSessionExercises.exerciseId))
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .limit(1);
    return row;
  }

  /** Next free `position` for a new exercise appended to the end of a session. */
  async nextPosition(sessionId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(trainingSessionExercises.position) })
      .from(trainingSessionExercises)
      .where(eq(trainingSessionExercises.sessionId, sessionId));
    return (row?.value ?? -1) + 1;
  }

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
    const deleted = await this.db
      .delete(trainingSessionExercises)
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .returning({ id: trainingSessionExercises.id });
    return deleted.length > 0;
  }

  async lastPerformanceByExerciseIds(
    userId: string,
    exerciseIds: string[],
  ): Promise<
    Map<
      string,
      {
        sets: number;
        reps: number;
        weightKg: number | null;
        restSeconds: number | null;
        date: string;
      }
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
      {
        sets: number;
        reps: number;
        weightKg: number | null;
        restSeconds: number | null;
        date: string;
      }
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
}
```

Replace the whole file with:

```ts
import type {
  Database,
  ExerciseRow,
  NewTrainingSessionExerciseRow,
  NewTrainingSessionRow,
  NewTrainingSessionSetRow,
  TrainingSessionExerciseRow,
  TrainingSessionRow,
  TrainingSessionSetRow,
} from '@acme/db';
import { exercises, trainingSessionExercises, trainingSessionSets, trainingSessions } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, max } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

export type TrainingSessionExerciseWithExercise = TrainingSessionExerciseRow & {
  exercise: ExerciseRow;
  sets: TrainingSessionSetRow[];
};

@Injectable()
export class TrainingRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listSessions(userId: string, from?: string, to?: string): Promise<TrainingSessionRow[]> {
    const conditions = [eq(trainingSessions.userId, userId)];
    if (from) conditions.push(gte(trainingSessions.date, from));
    if (to) conditions.push(lte(trainingSessions.date, to));

    return this.db
      .select()
      .from(trainingSessions)
      .where(and(...conditions))
      .orderBy(asc(trainingSessions.date));
  }

  async findSessionById(id: string, userId: string): Promise<TrainingSessionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .limit(1);
    return row;
  }

  async createSession(
    input: Pick<NewTrainingSessionRow, 'userId' | 'planId' | 'date' | 'type' | 'notes'>,
  ): Promise<TrainingSessionRow> {
    const [row] = await this.db.insert(trainingSessions).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async finishSession(
    id: string,
    userId: string,
    durationSeconds: number,
  ): Promise<TrainingSessionRow | undefined> {
    const [row] = await this.db
      .update(trainingSessions)
      .set({ durationSeconds, updatedAt: new Date() })
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .returning();
    return row;
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(trainingSessions)
      .where(and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)))
      .returning({ id: trainingSessions.id });
    return deleted.length > 0;
  }

  private async attachSets(
    groups: (TrainingSessionExerciseRow & { exercise: ExerciseRow })[],
  ): Promise<TrainingSessionExerciseWithExercise[]> {
    if (groups.length === 0) return [];
    const groupIds = groups.map((group) => group.id);
    const sets = await this.db
      .select()
      .from(trainingSessionSets)
      .where(inArray(trainingSessionSets.sessionExerciseId, groupIds))
      .orderBy(asc(trainingSessionSets.position));

    const setsByGroup = new Map<string, TrainingSessionSetRow[]>();
    for (const set of sets) {
      const existing = setsByGroup.get(set.sessionExerciseId) ?? [];
      existing.push(set);
      setsByGroup.set(set.sessionExerciseId, existing);
    }
    return groups.map((group) => ({ ...group, sets: setsByGroup.get(group.id) ?? [] }));
  }

  async listSessionExercises(sessionId: string): Promise<TrainingSessionExerciseWithExercise[]> {
    const groups = await this.db
      .select({
        id: trainingSessionExercises.id,
        sessionId: trainingSessionExercises.sessionId,
        exerciseId: trainingSessionExercises.exerciseId,
        notes: trainingSessionExercises.notes,
        restSeconds: trainingSessionExercises.restSeconds,
        position: trainingSessionExercises.position,
        createdAt: trainingSessionExercises.createdAt,
        updatedAt: trainingSessionExercises.updatedAt,
        exercise: exercises,
      })
      .from(trainingSessionExercises)
      .innerJoin(exercises, eq(exercises.id, trainingSessionExercises.exerciseId))
      .where(eq(trainingSessionExercises.sessionId, sessionId))
      .orderBy(asc(trainingSessionExercises.position));
    return this.attachSets(groups);
  }

  async findSessionExerciseById(
    id: string,
    sessionId: string,
  ): Promise<TrainingSessionExerciseWithExercise | undefined> {
    const [row] = await this.db
      .select({
        id: trainingSessionExercises.id,
        sessionId: trainingSessionExercises.sessionId,
        exerciseId: trainingSessionExercises.exerciseId,
        notes: trainingSessionExercises.notes,
        restSeconds: trainingSessionExercises.restSeconds,
        position: trainingSessionExercises.position,
        createdAt: trainingSessionExercises.createdAt,
        updatedAt: trainingSessionExercises.updatedAt,
        exercise: exercises,
      })
      .from(trainingSessionExercises)
      .innerJoin(exercises, eq(exercises.id, trainingSessionExercises.exerciseId))
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .limit(1);
    if (!row) return undefined;
    const [withSets] = await this.attachSets([row]);
    return withSets;
  }

  /** Next free `position` for a new exercise group appended to the end of a session. */
  async nextPosition(sessionId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(trainingSessionExercises.position) })
      .from(trainingSessionExercises)
      .where(eq(trainingSessionExercises.sessionId, sessionId));
    return (row?.value ?? -1) + 1;
  }

  async findGroupByExercise(
    sessionId: string,
    exerciseId: string,
  ): Promise<TrainingSessionExerciseRow | undefined> {
    const [row] = await this.db
      .select()
      .from(trainingSessionExercises)
      .where(
        and(
          eq(trainingSessionExercises.sessionId, sessionId),
          eq(trainingSessionExercises.exerciseId, exerciseId),
        ),
      )
      .limit(1);
    return row;
  }

  async createExerciseGroup(
    input: Pick<NewTrainingSessionExerciseRow, 'sessionId' | 'exerciseId' | 'position'>,
  ): Promise<TrainingSessionExerciseRow> {
    const [row] = await this.db.insert(trainingSessionExercises).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  /** Next free `position` for a new set appended within one exercise group. */
  async nextSetPosition(sessionExerciseId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(trainingSessionSets.position) })
      .from(trainingSessionSets)
      .where(eq(trainingSessionSets.sessionExerciseId, sessionExerciseId));
    return (row?.value ?? -1) + 1;
  }

  async addSet(
    input: Pick<NewTrainingSessionSetRow, 'sessionExerciseId' | 'reps' | 'weightKg' | 'position'>,
  ): Promise<TrainingSessionSetRow> {
    const [row] = await this.db.insert(trainingSessionSets).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async updateSet(
    setId: string,
    sessionExerciseId: string,
    input: { reps: number; weightKg: number | null },
  ): Promise<boolean> {
    const updated = await this.db
      .update(trainingSessionSets)
      .set({ reps: input.reps, weightKg: input.weightKg, updatedAt: new Date() })
      .where(
        and(
          eq(trainingSessionSets.id, setId),
          eq(trainingSessionSets.sessionExerciseId, sessionExerciseId),
        ),
      )
      .returning({ id: trainingSessionSets.id });
    return updated.length > 0;
  }

  async removeSet(setId: string, sessionExerciseId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(trainingSessionSets)
      .where(
        and(
          eq(trainingSessionSets.id, setId),
          eq(trainingSessionSets.sessionExerciseId, sessionExerciseId),
        ),
      )
      .returning({ id: trainingSessionSets.id });
    return deleted.length > 0;
  }

  async hasRemainingSets(sessionExerciseId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: trainingSessionSets.id })
      .from(trainingSessionSets)
      .where(eq(trainingSessionSets.sessionExerciseId, sessionExerciseId))
      .limit(1);
    return row !== undefined;
  }

  async updateExerciseNotes(id: string, sessionId: string, notes: string | null): Promise<boolean> {
    const updated = await this.db
      .update(trainingSessionExercises)
      .set({ notes, updatedAt: new Date() })
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .returning({ id: trainingSessionExercises.id });
    return updated.length > 0;
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
    const deleted = await this.db
      .delete(trainingSessionExercises)
      .where(
        and(eq(trainingSessionExercises.id, id), eq(trainingSessionExercises.sessionId, sessionId)),
      )
      .returning({ id: trainingSessionExercises.id });
    return deleted.length > 0;
  }

  async lastPerformanceByExerciseIds(
    userId: string,
    exerciseIds: string[],
  ): Promise<
    Map<string, { reps: number; weightKg: number | null; restSeconds: number | null; date: string }>
  > {
    const rows = await this.db
      .select({
        exerciseId: trainingSessionExercises.exerciseId,
        reps: trainingSessionSets.reps,
        weightKg: trainingSessionSets.weightKg,
        restSeconds: trainingSessionExercises.restSeconds,
        date: trainingSessions.date,
        setCreatedAt: trainingSessionSets.createdAt,
      })
      .from(trainingSessionSets)
      .innerJoin(
        trainingSessionExercises,
        eq(trainingSessionExercises.id, trainingSessionSets.sessionExerciseId),
      )
      .innerJoin(trainingSessions, eq(trainingSessions.id, trainingSessionExercises.sessionId))
      .where(
        and(
          eq(trainingSessions.userId, userId),
          inArray(trainingSessionExercises.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(trainingSessions.date), desc(trainingSessionSets.createdAt));

    const result = new Map<
      string,
      { reps: number; weightKg: number | null; restSeconds: number | null; date: string }
    >();
    for (const row of rows) {
      // Rows are ordered most-recent-first, so the first row seen per
      // exercise id is that exercise's most recently logged individual set.
      if (!result.has(row.exerciseId)) {
        result.set(row.exerciseId, {
          reps: row.reps,
          weightKg: row.weightKg,
          restSeconds: row.restSeconds,
          date: row.date,
        });
      }
    }
    return result;
  }
}
```

- [ ] **Step 2: Verify it typechecks against the (not-yet-updated) service**

This will fail until Task 6 rewrites the service — that's expected. Just confirm there are no *repository-internal* type errors:

```bash
pnpm --filter api exec tsc --noEmit 2>&1 | grep -v "training.service"
```

Expected: no output referencing `training.repository.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/training/training.repository.ts
git commit -m "feat(api): repository support for per-set training log"
```

---

### Task 6: Backend — service, controller, and tests

**Files:**
- Modify: `apps/api/src/modules/training/training.service.ts`
- Modify: `apps/api/src/modules/training/training.controller.ts`
- Modify: `apps/api/src/modules/training/training.service.spec.ts`

**Interfaces:**
- Consumes: repository methods from Task 5.
- Produces:
  - `TrainingService.addExercise(sessionId, userId, input: AddTrainingSessionExerciseInput): Promise<TrainingSessionExercise | undefined>` — find-or-create group, then append a set.
  - `TrainingService.updateSet(sessionId, exerciseLogId, setId, userId, input): Promise<TrainingSessionExercise | undefined>`
  - `TrainingService.removeSet(sessionId, exerciseLogId, setId, userId): Promise<boolean>` — also removes the group if it was the last set.
  - `TrainingService.updateExerciseNotes(sessionId, exerciseLogId, userId, notes): Promise<TrainingSessionExercise | undefined>`
  - `PATCH .../sets/:setId`, `DELETE .../sets/:setId`, `PATCH .../notes` wired end-to-end.

- [ ] **Step 1: Write the failing tests**

Current `training.service.spec.ts` in full:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { TrainingRepository } from './training.repository.js';
import { TrainingService } from './training.service.js';

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

describe('TrainingService.finishSession', () => {
  it('passes the elapsed duration through to the repository', async () => {
    const repository = createRepositoryMock({
      finishSession: vi.fn().mockResolvedValue({ id: 'session-1', durationSeconds: 120 }),
    });
    const service = new TrainingService(repository);

    await service.finishSession('session-1', 'user-1', 120);

    expect(repository.finishSession).toHaveBeenCalledWith('session-1', 'user-1', 120);
  });
});

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

describe('TrainingService.getLastPerformance', () => {
  it('returns an entry only for exercise ids that have history', async () => {
    const repository = createRepositoryMock({
      lastPerformanceByExerciseIds: vi
        .fn()
        .mockResolvedValue(
          new Map([['ex-2', { sets: 3, reps: 8, weightKg: 40, date: '2026-08-06' }]]),
        ),
    });
    const service = new TrainingService(repository);

    const result = await service.getLastPerformance('user-1', ['ex-1', 'ex-2']);

    expect(result).toEqual([
      { exerciseId: 'ex-2', sets: 3, reps: 8, weightKg: 40, date: '2026-08-06' },
    ]);
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

Replace the whole file with:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { TrainingRepository } from './training.repository.js';
import { TrainingService } from './training.service.js';

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
    findGroupByExercise: vi.fn(),
    createExerciseGroup: vi.fn(),
    nextSetPosition: vi.fn(),
    addSet: vi.fn(),
    updateSet: vi.fn(),
    removeSet: vi.fn(),
    hasRemainingSets: vi.fn(),
    updateExerciseNotes: vi.fn(),
    updateExerciseRest: vi.fn(),
    removeExercise: vi.fn(),
    lastPerformanceByExerciseIds: vi.fn(),
    ...overrides,
  } as unknown as TrainingRepository;
}

describe('TrainingService.finishSession', () => {
  it('passes the elapsed duration through to the repository', async () => {
    const repository = createRepositoryMock({
      finishSession: vi.fn().mockResolvedValue({ id: 'session-1', durationSeconds: 120 }),
    });
    const service = new TrainingService(repository);

    await service.finishSession('session-1', 'user-1', 120);

    expect(repository.finishSession).toHaveBeenCalledWith('session-1', 'user-1', 120);
  });
});

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

describe('TrainingService.addExercise', () => {
  it('creates a new group and appends the first set when none exists yet', async () => {
    const group = { id: 'group-1', sessionId: 'session-1' };
    const enriched = { id: 'group-1', sets: [{ id: 'set-1', reps: 5, weightKg: 50 }] };
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      findGroupByExercise: vi.fn().mockResolvedValue(undefined),
      nextPosition: vi.fn().mockResolvedValue(0),
      createExerciseGroup: vi.fn().mockResolvedValue(group),
      nextSetPosition: vi.fn().mockResolvedValue(0),
      addSet: vi.fn().mockResolvedValue({ id: 'set-1' }),
      findSessionExerciseById: vi.fn().mockResolvedValue(enriched),
    });
    const service = new TrainingService(repository);

    const result = await service.addExercise('session-1', 'user-1', {
      exerciseId: 'ex-1',
      reps: 5,
      weightKg: 50,
    });

    expect(repository.createExerciseGroup).toHaveBeenCalledWith({
      sessionId: 'session-1',
      exerciseId: 'ex-1',
      position: 0,
    });
    expect(repository.addSet).toHaveBeenCalledWith({
      sessionExerciseId: 'group-1',
      reps: 5,
      weightKg: 50,
      position: 0,
    });
    expect(result).toBe(enriched);
  });

  it('appends a set to the existing group instead of creating a duplicate', async () => {
    const group = { id: 'group-1', sessionId: 'session-1' };
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      findGroupByExercise: vi.fn().mockResolvedValue(group),
      nextSetPosition: vi.fn().mockResolvedValue(2),
      addSet: vi.fn().mockResolvedValue({ id: 'set-3' }),
      findSessionExerciseById: vi.fn().mockResolvedValue({ id: 'group-1', sets: [] }),
    });
    const service = new TrainingService(repository);

    await service.addExercise('session-1', 'user-1', { exerciseId: 'ex-1', reps: 4, weightKg: 60 });

    expect(repository.createExerciseGroup).not.toHaveBeenCalled();
    expect(repository.addSet).toHaveBeenCalledWith({
      sessionExerciseId: 'group-1',
      reps: 4,
      weightKg: 60,
      position: 2,
    });
  });
});

describe('TrainingService.removeSet', () => {
  it('removes the exercise group too when the removed set was the last one', async () => {
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      removeSet: vi.fn().mockResolvedValue(true),
      hasRemainingSets: vi.fn().mockResolvedValue(false),
      removeExercise: vi.fn().mockResolvedValue(true),
    });
    const service = new TrainingService(repository);

    const result = await service.removeSet('session-1', 'group-1', 'set-1', 'user-1');

    expect(result).toBe(true);
    expect(repository.removeExercise).toHaveBeenCalledWith('group-1', 'session-1');
  });

  it('leaves the group alone when other sets remain', async () => {
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      removeSet: vi.fn().mockResolvedValue(true),
      hasRemainingSets: vi.fn().mockResolvedValue(true),
    });
    const service = new TrainingService(repository);

    const result = await service.removeSet('session-1', 'group-1', 'set-1', 'user-1');

    expect(result).toBe(true);
    expect(repository.removeExercise).not.toHaveBeenCalled();
  });
});

describe('TrainingService.getLastPerformance', () => {
  it('returns an entry only for exercise ids that have history', async () => {
    const repository = createRepositoryMock({
      lastPerformanceByExerciseIds: vi
        .fn()
        .mockResolvedValue(
          new Map([['ex-2', { reps: 8, weightKg: 40, restSeconds: null, date: '2026-08-06' }]]),
        ),
    });
    const service = new TrainingService(repository);

    const result = await service.getLastPerformance('user-1', ['ex-1', 'ex-2']);

    expect(result).toEqual([
      { exerciseId: 'ex-2', reps: 8, weightKg: 40, restSeconds: null, date: '2026-08-06' },
    ]);
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

- [ ] **Step 2: Run to verify the new tests fail**

```bash
pnpm --filter api exec vitest run src/modules/training/training.service.spec.ts
```

Expected: FAIL — `service.addExercise`/`removeSet` calls don't match the not-yet-rewritten service (old `addExercise` signature, no `removeSet` method).

- [ ] **Step 3: Rewrite the service**

Current `training.service.ts` in full:

```ts
import type {
  AddTrainingSessionExerciseInput,
  CreateTrainingSessionInput,
  LastPerformanceEntry,
  TrainingSession,
  TrainingSessionExercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { TrainingRepository } from './training.repository.js';

@Injectable()
export class TrainingService {
  constructor(private readonly trainingRepository: TrainingRepository) {}

  async listSessions(userId: string, from?: string, to?: string): Promise<TrainingSession[]> {
    return this.trainingRepository.listSessions(userId, from, to);
  }

  async getSession(id: string, userId: string): Promise<TrainingSessionWithExercises | undefined> {
    const session = await this.trainingRepository.findSessionById(id, userId);
    if (!session) return undefined;
    const exercises = await this.trainingRepository.listSessionExercises(id);
    return { ...session, exercises };
  }

  async createSession(userId: string, input: CreateTrainingSessionInput): Promise<TrainingSession> {
    return this.trainingRepository.createSession({
      userId,
      planId: input.planId ?? null,
      date: input.date,
      type: input.type,
      notes: input.notes ?? null,
    });
  }

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
    return this.trainingRepository.removeSession(id, userId);
  }

  async addExercise(
    sessionId: string,
    userId: string,
    input: AddTrainingSessionExerciseInput,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const position = await this.trainingRepository.nextPosition(sessionId);
    const created = await this.trainingRepository.addExercise({
      sessionId,
      exerciseId: input.exerciseId,
      sets: input.sets,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      position,
    });
    return this.trainingRepository.findSessionExerciseById(created.id, sessionId);
  }

  async removeExercise(sessionId: string, exerciseId: string, userId: string): Promise<boolean> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return false;
    return this.trainingRepository.removeExercise(exerciseId, sessionId);
  }

  async getLastPerformance(userId: string, exerciseIds: string[]): Promise<LastPerformanceEntry[]> {
    if (exerciseIds.length === 0) return [];
    const map = await this.trainingRepository.lastPerformanceByExerciseIds(userId, exerciseIds);
    return exerciseIds.flatMap((exerciseId) => {
      const entry = map.get(exerciseId);
      return entry ? [{ exerciseId, ...entry }] : [];
    });
  }
}
```

Replace the whole file with:

```ts
import type {
  AddTrainingSessionExerciseInput,
  CreateTrainingSessionInput,
  LastPerformanceEntry,
  TrainingSession,
  TrainingSessionExercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { TrainingRepository } from './training.repository.js';

@Injectable()
export class TrainingService {
  constructor(private readonly trainingRepository: TrainingRepository) {}

  async listSessions(userId: string, from?: string, to?: string): Promise<TrainingSession[]> {
    return this.trainingRepository.listSessions(userId, from, to);
  }

  async getSession(id: string, userId: string): Promise<TrainingSessionWithExercises | undefined> {
    const session = await this.trainingRepository.findSessionById(id, userId);
    if (!session) return undefined;
    const exercises = await this.trainingRepository.listSessionExercises(id);
    return { ...session, exercises };
  }

  async createSession(userId: string, input: CreateTrainingSessionInput): Promise<TrainingSession> {
    return this.trainingRepository.createSession({
      userId,
      planId: input.planId ?? null,
      date: input.date,
      type: input.type,
      notes: input.notes ?? null,
    });
  }

  async finishSession(
    id: string,
    userId: string,
    durationSeconds: number,
  ): Promise<TrainingSession | undefined> {
    return this.trainingRepository.finishSession(id, userId, durationSeconds);
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
    return this.trainingRepository.removeSession(id, userId);
  }

  /** Logs one set. Finds-or-creates the exercise group, then appends the set. */
  async addExercise(
    sessionId: string,
    userId: string,
    input: AddTrainingSessionExerciseInput,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;

    let group = await this.trainingRepository.findGroupByExercise(sessionId, input.exerciseId);
    if (!group) {
      const position = await this.trainingRepository.nextPosition(sessionId);
      group = await this.trainingRepository.createExerciseGroup({
        sessionId,
        exerciseId: input.exerciseId,
        position,
      });
    }

    const setPosition = await this.trainingRepository.nextSetPosition(group.id);
    await this.trainingRepository.addSet({
      sessionExerciseId: group.id,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      position: setPosition,
    });

    return this.trainingRepository.findSessionExerciseById(group.id, sessionId);
  }

  async updateSet(
    sessionId: string,
    exerciseLogId: string,
    setId: string,
    userId: string,
    input: { reps: number; weightKg: number | null },
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const updated = await this.trainingRepository.updateSet(setId, exerciseLogId, input);
    if (!updated) return undefined;
    return this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
  }

  /** Removes one set; if it was the group's last set, removes the group too. */
  async removeSet(
    sessionId: string,
    exerciseLogId: string,
    setId: string,
    userId: string,
  ): Promise<boolean> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return false;
    const removed = await this.trainingRepository.removeSet(setId, exerciseLogId);
    if (!removed) return false;
    const hasRemaining = await this.trainingRepository.hasRemainingSets(exerciseLogId);
    if (!hasRemaining) await this.trainingRepository.removeExercise(exerciseLogId, sessionId);
    return true;
  }

  async updateExerciseNotes(
    sessionId: string,
    exerciseLogId: string,
    userId: string,
    notes: string | null,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const updated = await this.trainingRepository.updateExerciseNotes(exerciseLogId, sessionId, notes);
    if (!updated) return undefined;
    return this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
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

  async removeExercise(sessionId: string, exerciseId: string, userId: string): Promise<boolean> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return false;
    return this.trainingRepository.removeExercise(exerciseId, sessionId);
  }

  async getLastPerformance(userId: string, exerciseIds: string[]): Promise<LastPerformanceEntry[]> {
    if (exerciseIds.length === 0) return [];
    const map = await this.trainingRepository.lastPerformanceByExerciseIds(userId, exerciseIds);
    return exerciseIds.flatMap((exerciseId) => {
      const entry = map.get(exerciseId);
      return entry ? [{ exerciseId, ...entry }] : [];
    });
  }
}
```

- [ ] **Step 4: Run to verify the tests pass**

```bash
pnpm --filter api exec vitest run src/modules/training/training.service.spec.ts
```

Expected: PASS, all tests.

- [ ] **Step 5: Wire the controller**

Current `training.controller.ts` in full:

```ts
import { contract } from '@acme/contracts';
import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { RequestWithSession } from '../../common/guards/session.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { TrainingService } from './training.service.js';

const trainingContract = contract.training;

@Controller()
@UseGuards(SessionGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @TsRestHandler(trainingContract)
  async handler(@Req() request: RequestWithSession) {
    const userId = request.currentUser.id;

    return tsRestHandler(trainingContract, {
      listSessions: async ({ query }) => {
        const sessions = await this.trainingService.listSessions(userId, query.from, query.to);
        return { status: 200, body: sessions };
      },

      lastPerformance: async ({ query }) => {
        const exerciseIds = query.exerciseIds.split(',');
        const entries = await this.trainingService.getLastPerformance(userId, exerciseIds);
        return { status: 200, body: entries };
      },

      getSession: async ({ params }) => {
        const session = await this.trainingService.getSession(params.id, userId);
        if (!session) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 200, body: session };
      },

      createSession: async ({ body }) => {
        const session = await this.trainingService.createSession(userId, body);
        return { status: 201, body: session };
      },

      finishSession: async ({ params, body }) => {
        const session = await this.trainingService.finishSession(
          params.id,
          userId,
          body.durationSeconds,
        );
        if (!session) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 200, body: session };
      },

      removeSession: async ({ params }) => {
        const removed = await this.trainingService.removeSession(params.id, userId);
        if (!removed) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 204, body: undefined };
      },

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
        const removed = await this.trainingService.removeExercise(
          params.sessionId,
          params.exerciseId,
          userId,
        );
        if (!removed) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 204, body: undefined };
      },
    });
  }
}
```

Replace the whole file with:

```ts
import { contract } from '@acme/contracts';
import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { RequestWithSession } from '../../common/guards/session.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { TrainingService } from './training.service.js';

const trainingContract = contract.training;

@Controller()
@UseGuards(SessionGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @TsRestHandler(trainingContract)
  async handler(@Req() request: RequestWithSession) {
    const userId = request.currentUser.id;

    return tsRestHandler(trainingContract, {
      listSessions: async ({ query }) => {
        const sessions = await this.trainingService.listSessions(userId, query.from, query.to);
        return { status: 200, body: sessions };
      },

      lastPerformance: async ({ query }) => {
        const exerciseIds = query.exerciseIds.split(',');
        const entries = await this.trainingService.getLastPerformance(userId, exerciseIds);
        return { status: 200, body: entries };
      },

      getSession: async ({ params }) => {
        const session = await this.trainingService.getSession(params.id, userId);
        if (!session) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 200, body: session };
      },

      createSession: async ({ body }) => {
        const session = await this.trainingService.createSession(userId, body);
        return { status: 201, body: session };
      },

      finishSession: async ({ params, body }) => {
        const session = await this.trainingService.finishSession(
          params.id,
          userId,
          body.durationSeconds,
        );
        if (!session) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 200, body: session };
      },

      removeSession: async ({ params }) => {
        const removed = await this.trainingService.removeSession(params.id, userId);
        if (!removed) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 204, body: undefined };
      },

      addSessionExercise: async ({ params, body }) => {
        const exercise = await this.trainingService.addExercise(params.sessionId, userId, body);
        if (!exercise) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 201, body: exercise };
      },

      updateSessionSet: async ({ params, body }) => {
        const exercise = await this.trainingService.updateSet(
          params.sessionId,
          params.exerciseId,
          params.setId,
          userId,
          body,
        );
        if (!exercise) return { status: 404, body: { message: 'Set not found' } };
        return { status: 200, body: exercise };
      },

      removeSessionSet: async ({ params }) => {
        const removed = await this.trainingService.removeSet(
          params.sessionId,
          params.exerciseId,
          params.setId,
          userId,
        );
        if (!removed) return { status: 404, body: { message: 'Set not found' } };
        return { status: 204, body: undefined };
      },

      updateSessionExerciseNotes: async ({ params, body }) => {
        const exercise = await this.trainingService.updateExerciseNotes(
          params.sessionId,
          params.exerciseId,
          userId,
          body.notes,
        );
        if (!exercise) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 200, body: exercise };
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
        const removed = await this.trainingService.removeExercise(
          params.sessionId,
          params.exerciseId,
          userId,
        );
        if (!removed) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 204, body: undefined };
      },
    });
  }
}
```

- [ ] **Step 6: Run the full API suite and typecheck**

```bash
pnpm --filter api exec vitest run
pnpm --filter api exec tsc --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 7: Lint and commit**

```bash
pnpm exec biome check --write apps/api/src/modules/training
git add apps/api/src/modules/training/
git commit -m "feat(api): service/controller support for per-set training log"
```

---

### Task 7: Frontend — dictionaries

**Files:**
- Modify: `apps/web/src/lib/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/lib/i18n/dictionaries/pl.ts`

**Interfaces:**
- Produces: `dict.activeTracking.loggedExercises` (renamed from `previousSets`), `dict.activeTracking.lastTime` now takes `(weightKg, reps, date)` (drops `sets`), `dict.sessionDetail.notesPlaceholder`, `dict.sessionDetail.deleteSetSr`.

- [ ] **Step 1: Update `en.ts`**

In the `activeTracking` block:

```ts
  activeTracking: {
    duration: 'Active Workout Duration',
    start: 'Start',
    alreadyActive: 'You already have an active training in progress.',
    goToActive: 'Go to it',
    logSet: 'Log Set',
    previousSets: 'Previous Sets',
    resting: 'Resting…',
    suggestedNext: 'Suggested Next',
    lastTime: (weightKg: number | null, reps: number, sets: number, date: string) =>
      `Last time: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps × ${sets} sets (${date})`,
    alreadyTrained: (muscleGroups: string) => `Already trained today: ${muscleGroups}`,
  },
```

becomes:

```ts
  activeTracking: {
    duration: 'Active Workout Duration',
    start: 'Start',
    alreadyActive: 'You already have an active training in progress.',
    goToActive: 'Go to it',
    logSet: 'Log Set',
    loggedExercises: 'Logged Exercises',
    resting: 'Resting…',
    suggestedNext: 'Suggested Next',
    lastTime: (weightKg: number | null, reps: number, date: string) =>
      `Last time: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps (${date})`,
    alreadyTrained: (muscleGroups: string) => `Already trained today: ${muscleGroups}`,
  },
```

In the `sessionDetail` block:

```ts
  sessionDetail: {
    loginRequired: 'Log in to see this training session.',
    deleteTitle: 'Delete this training?',
    deleteDescription:
      'This training session and its logged exercises will be permanently deleted.',
    deleteWorkoutSr: 'Delete workout',
    noSets: 'No sets logged yet — log your first one above.',
    finishTitle: 'Finish this workout?',
    finishDescription: 'You can keep logging sets later — this just takes you back to Tracking.',
    exerciseLine: (weightKg: number | null, reps: number, sets: number) =>
      `${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps × ${sets} sets`,
    removeExerciseDescription: (name: string) => `"${name}" will be removed from this training.`,
  },
```

becomes:

```ts
  sessionDetail: {
    loginRequired: 'Log in to see this training session.',
    deleteTitle: 'Delete this training?',
    deleteDescription:
      'This training session and its logged exercises will be permanently deleted.',
    deleteWorkoutSr: 'Delete workout',
    noSets: 'No sets logged yet — log your first one above.',
    notesPlaceholder: 'Add a note…',
    deleteSetSr: 'Delete set',
    finishTitle: 'Finish this workout?',
    finishDescription: 'You can keep logging sets later — this just takes you back to Tracking.',
    exerciseLine: (weightKg: number | null, reps: number, sets: number) =>
      `${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps × ${sets} sets`,
    removeExerciseDescription: (name: string) => `"${name}" will be removed from this training.`,
  },
```

(`exerciseLine` is unchanged — it's still used for workout-plan target lines, a separate table untouched by this feature.)

- [ ] **Step 2: Update `pl.ts`** the same way

`activeTracking` block:

```ts
  activeTracking: {
    duration: 'Czas trwania treningu',
    start: 'Rozpocznij',
    alreadyActive: 'Masz już aktywny trening w toku.',
    goToActive: 'Przejdź do niego',
    logSet: 'Zapisz serię',
    previousSets: 'Poprzednie serie',
    resting: 'Odpoczynek…',
    suggestedNext: 'Sugerowane kolejne',
    lastTime: (weightKg: number | null, reps: number, sets: number, date: string) =>
      `Poprzednio: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. × ${sets} serie (${date})`,
    alreadyTrained: (muscleGroups: string) => `Już trenowane dziś: ${muscleGroups}`,
  },
```

becomes:

```ts
  activeTracking: {
    duration: 'Czas trwania treningu',
    start: 'Rozpocznij',
    alreadyActive: 'Masz już aktywny trening w toku.',
    goToActive: 'Przejdź do niego',
    logSet: 'Zapisz serię',
    loggedExercises: 'Zapisane ćwiczenia',
    resting: 'Odpoczynek…',
    suggestedNext: 'Sugerowane kolejne',
    lastTime: (weightKg: number | null, reps: number, date: string) =>
      `Poprzednio: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. (${date})`,
    alreadyTrained: (muscleGroups: string) => `Już trenowane dziś: ${muscleGroups}`,
  },
```

`sessionDetail` block:

```ts
  sessionDetail: {
    loginRequired: 'Zaloguj się, aby zobaczyć ten trening.',
    deleteTitle: 'Usunąć ten trening?',
    deleteDescription: 'Ten trening i wszystkie zapisane w nim ćwiczenia zostaną trwale usunięte.',
    deleteWorkoutSr: 'Usuń trening',
    noSets: 'Brak zapisanych serii — zapisz pierwszą powyżej.',
    finishTitle: 'Zakończyć ten trening?',
    finishDescription:
      'Możesz wrócić do zapisywania serii później — to tylko przenosi Cię z powrotem do Śledzenia.',
    exerciseLine: (weightKg: number | null, reps: number, sets: number) =>
      `${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. × ${sets} serie`,
    removeExerciseDescription: (name: string) => `„${name}” zostanie usunięte z tego treningu.`,
  },
```

becomes:

```ts
  sessionDetail: {
    loginRequired: 'Zaloguj się, aby zobaczyć ten trening.',
    deleteTitle: 'Usunąć ten trening?',
    deleteDescription: 'Ten trening i wszystkie zapisane w nim ćwiczenia zostaną trwale usunięte.',
    deleteWorkoutSr: 'Usuń trening',
    noSets: 'Brak zapisanych serii — zapisz pierwszą powyżej.',
    notesPlaceholder: 'Dodaj notatkę…',
    deleteSetSr: 'Usuń serię',
    finishTitle: 'Zakończyć ten trening?',
    finishDescription:
      'Możesz wrócić do zapisywania serii później — to tylko przenosi Cię z powrotem do Śledzenia.',
    exerciseLine: (weightKg: number | null, reps: number, sets: number) =>
      `${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. × ${sets} serie`,
    removeExerciseDescription: (name: string) => `„${name}” zostanie usunięte z tego treningu.`,
  },
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: errors only from `session-detail.tsx` referencing the old `previousSets` key and 4-arg `lastTime` — fixed in Task 9.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/i18n/dictionaries/
git commit -m "feat(web): update tracker copy for the per-set log"
```

---

### Task 8: Frontend — `plan-progress.ts` and its test

**Files:**
- Modify: `apps/web/src/lib/plan-progress.ts`
- Modify: `apps/web/src/lib/plan-progress.test.ts`

**Interfaces:**
- Produces: `prefillFrom(planExercise: { reps, weightKg }, last?): { reps: number; weightKg: string }` (drops `sets`). `unloggedPlanExercises` unchanged.

- [ ] **Step 1: Edit `plan-progress.ts`**

Current file in full:

```ts
/** Plan exercises whose catalog exercise id has no matching entry in `loggedExercises`. */
export function unloggedPlanExercises<
  P extends { exercise: { id: string } },
  L extends { exercise: { id: string } },
>(planExercises: P[], loggedExercises: L[]): P[] {
  const loggedIds = new Set(loggedExercises.map((entry) => entry.exercise.id));
  return planExercises.filter((entry) => !loggedIds.has(entry.exercise.id));
}

type PrefillSource = { sets: number; reps: number; weightKg: number | null };

/** Which sets/reps/weight to pre-fill an exercise-log form with: `last` performance wins when present (even if its weight is null/bodyweight), otherwise falls back to the plan's stored target. */
export function prefillFrom(
  planExercise: PrefillSource,
  last?: PrefillSource,
): { sets: number; reps: number; weightKg: string } {
  const source = last ?? planExercise;
  return {
    sets: source.sets,
    reps: source.reps,
    weightKg: source.weightKg == null ? '' : String(source.weightKg),
  };
}
```

Replace the whole file with:

```ts
/** Plan exercises whose catalog exercise id has no matching entry in `loggedExercises`. */
export function unloggedPlanExercises<
  P extends { exercise: { id: string } },
  L extends { exercise: { id: string } },
>(planExercises: P[], loggedExercises: L[]): P[] {
  const loggedIds = new Set(loggedExercises.map((entry) => entry.exercise.id));
  return planExercises.filter((entry) => !loggedIds.has(entry.exercise.id));
}

type PrefillSource = { reps: number; weightKg: number | null };

/** Which reps/weight to pre-fill a set-log form with: `last` performance wins when present (even if its weight is null/bodyweight), otherwise falls back to the plan's stored target. */
export function prefillFrom(
  planExercise: PrefillSource,
  last?: PrefillSource,
): { reps: number; weightKg: string } {
  const source = last ?? planExercise;
  return {
    reps: source.reps,
    weightKg: source.weightKg == null ? '' : String(source.weightKg),
  };
}
```

- [ ] **Step 2: Update the test**

Current `plan-progress.test.ts` `prefillFrom` block:

```ts
describe('prefillFrom', () => {
  it('uses the plan target when there is no last-performance entry', () => {
    const planExercise = { sets: 4, reps: 8, weightKg: 60 };

    expect(prefillFrom(planExercise)).toEqual({ sets: 4, reps: 8, weightKg: '60' });
  });

  it('uses last performance when present, including a non-null weight', () => {
    const planExercise = { sets: 4, reps: 8, weightKg: 60 };
    const last = { sets: 3, reps: 10, weightKg: 45 };

    expect(prefillFrom(planExercise, last)).toEqual({ sets: 3, reps: 10, weightKg: '45' });
  });

  it('treats a real last-performance entry with a null (bodyweight) weight as empty, not the plan target', () => {
    const planExercise = { sets: 4, reps: 8, weightKg: 60 };
    const last = { sets: 3, reps: 12, weightKg: null };

    expect(prefillFrom(planExercise, last)).toEqual({ sets: 3, reps: 12, weightKg: '' });
  });
});
```

becomes:

```ts
describe('prefillFrom', () => {
  it('uses the plan target when there is no last-performance entry', () => {
    const planExercise = { reps: 8, weightKg: 60 };

    expect(prefillFrom(planExercise)).toEqual({ reps: 8, weightKg: '60' });
  });

  it('uses last performance when present, including a non-null weight', () => {
    const planExercise = { reps: 8, weightKg: 60 };
    const last = { reps: 10, weightKg: 45 };

    expect(prefillFrom(planExercise, last)).toEqual({ reps: 10, weightKg: '45' });
  });

  it('treats a real last-performance entry with a null (bodyweight) weight as empty, not the plan target', () => {
    const planExercise = { reps: 8, weightKg: 60 };
    const last = { reps: 12, weightKg: null };

    expect(prefillFrom(planExercise, last)).toEqual({ reps: 12, weightKg: '' });
  });
});
```

(Leave the `unloggedPlanExercises` describe block untouched.)

- [ ] **Step 3: Run the test**

```bash
pnpm --filter web exec vitest run src/lib/plan-progress.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/plan-progress.ts apps/web/src/lib/plan-progress.test.ts
git commit -m "feat(web): drop sets-count from prefillFrom"
```

---

### Task 9: Frontend — rewrite `session-detail.tsx`

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`

**Interfaces:**
- Consumes: `TrainingSessionExercise.sets: TrainingSessionSet[]` / `.notes` (Task 4), rebuilt `@acme/contracts`/`@acme/api-client`, updated dict keys (Task 7), updated `prefillFrom` (Task 8).
- Produces: no further tasks depend on this one. This step also carries the already-fixed, previously-uncommitted `last-performance` query bug fix (returning `null` instead of `undefined`).

- [ ] **Step 1: Rebuild the packages the web app reads types from**

```bash
pnpm --filter @acme/contracts build
pnpm --filter @acme/api-client build
```

Expected: both succeed.

- [ ] **Step 2: Replace the whole file**

Replace `apps/web/src/components/session-detail.tsx` in full with:

```tsx
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
```

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm --filter web exec tsc --noEmit
pnpm exec biome check --write apps/web/src/components/session-detail.tsx
```

Expected: no type errors; Biome may reformat, accept its output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/session-detail.tsx
git commit -m "feat(web): rewrite tracker page around per-set editable log

Also carries the previously-diagnosed last-performance query fix
(returning null instead of undefined, which crashed React Query)."
```

---

### Task 10: Frontend — `progress/page.tsx` volume/personal-best math

**Files:**
- Modify: `apps/web/src/app/progress/page.tsx`

- [ ] **Step 1: Update the aggregation loop**

Current block (lines 94–107):

```ts
    for (const exercise of session.exercises) {
      const weight = exercise.weightKg ?? 0;
      volumeByWeek[weekIndex] =
        (volumeByWeek[weekIndex] ?? 0) + exercise.sets * exercise.reps * weight;
      const best = bestByExercise.get(exercise.exercise.name);
      if (weight > 0 && (!best || weight > best.weight)) {
        bestByExercise.set(exercise.exercise.name, {
          weight,
          reps: exercise.reps,
          date: session.date,
        });
      }
    }
```

Replace with:

```ts
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const weight = set.weightKg ?? 0;
        volumeByWeek[weekIndex] = (volumeByWeek[weekIndex] ?? 0) + set.reps * weight;
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
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Lint and commit**

```bash
pnpm exec biome check --write apps/web/src/app/progress/page.tsx
git add apps/web/src/app/progress/page.tsx
git commit -m "feat(web): sum progress volume/bests per individual set"
```

---

### Task 11: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full monorepo build**

```bash
pnpm build
```

Expected: all packages/apps build (this also catches any leftover stale-dist type mismatches, as it has in prior rounds).

- [ ] **Step 2: Full test suite**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 3: Full typecheck and lint**

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
pnpm exec biome check apps/api/src/modules/training apps/web/src/components/session-detail.tsx apps/web/src/app/progress/page.tsx apps/web/src/lib/plan-progress.ts packages/contracts/src packages/db/src
```

Expected: no errors.

- [ ] **Step 4: Confirm migrations are applied**

```bash
pnpm db:migrate
```

Expected: `Migrations complete.` (idempotent).

- [ ] **Step 5: Manual verification**

Run the app and, on a training session's detail page:

1. Log a set for a brand-new exercise (reps + weight, no sets-count field). Confirm a card appears below with that one set.
2. Use the card's own "+ add set" mini-form (prefilled from the last set) to log two more sets with different reps/weight (e.g. 50kg×5, then edit to 60kg×5). Confirm three distinct rows.
3. Tap a set's reps number, change it, confirm it persists after a page reload.
4. Tap a set's weight, clear it (bodyweight), confirm it shows as unset and persists.
5. Delete one set (not the last), confirm the remaining two stay correct.
6. Delete the last remaining set, confirm the whole card disappears.
7. Add a note to an exercise card, confirm it persists after reload.
8. Tap the card's rest badge (not the floating countdown), change the value, confirm it persists and that a *new* rest period for that exercise later in the session seeds from the new value.
9. Confirm `+15s`/Reset on the floating countdown still behave correctly (from the previous feature — shouldn't have regressed).
10. Open the Progress page, confirm it renders without errors and the volume/personal-best numbers look sane.
