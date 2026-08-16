# Exercise Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every exercise in the `/exercises` catalog its own detail page (longer how-to-perform description, common mistakes, setup/position notes, optional video/photo link), reachable via a button on each catalog row.

**Architecture:** Add four nullable text columns to the `exercises` table, expose them through a new `getExercise` contract route (`GET /exercises/:id`), and render them on a new `/exercises/[id]` server-rendered page — following the exact same fetch/notFound/feature-component shape already used by `/plans/[id]`.

**Tech Stack:** Drizzle ORM + drizzle-kit (migrations), ts-rest (contract), NestJS (API), Next.js App Router server components, `@acme/ui` primitives, vitest.

## Global Constraints

- Nullable columns only — no `NOT NULL` on the four new fields; existing catalog rows must remain valid without a data backfill.
- No file upload / CDN — `videoUrl` is a plain external URL string.
- No dropdown/kebab menu — the catalog row gets one icon button that navigates to the detail page.
- Do not touch `exercise-row.tsx`, `exercise-log-card.tsx`, `exercise-picker.tsx`, or `exercise-edit-row.tsx` — plan/session exercise views are out of scope.
- `pl.ts` dictionary is typed as `Dictionary` (inferred from `en.ts`) — any key added to `en.ts` must be added to `pl.ts` too, or the web package fails to typecheck.
- Follow existing patterns exactly: `getPlan`/`PlansController` 404 shape (`{ status: 404, body: { message: string } }`) and `/plans/[id]/page.tsx`'s fetch/`notFound()` shape are the templates for the new route and page.

---

### Task 1: Schema, migration, and seed content

**Files:**
- Modify: `packages/db/src/schema/exercises.ts`
- Modify: `packages/db/src/seed.ts`
- Create (generated): `packages/db/drizzle/00XX_<name>.sql` and `packages/db/drizzle/meta/_journal.json` entry (via `drizzle-kit generate`, do not hand-write)

**Interfaces:**
- Produces: `ExerciseRow` / `NewExerciseRow` (from `packages/db/src/schema/exercises.ts`) gain `instructions: string | null`, `commonMistakes: string | null`, `setupNotes: string | null`, `videoUrl: string | null`. Task 2 and Task 3 depend on these exact field names.

- [ ] **Step 1: Add the four columns to the schema**

Edit `packages/db/src/schema/exercises.ts`:

```ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Global, read-only exercise catalog — seeded, not user-editable. */
export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  muscleGroups: text('muscle_groups').array().notNull(),
  equipment: text('equipment').notNull(),
  description: text('description').notNull(),
  instructions: text('instructions'),
  commonMistakes: text('common_mistakes'),
  setupNotes: text('setup_notes'),
  videoUrl: text('video_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ExerciseRow = typeof exercises.$inferSelect;
export type NewExerciseRow = typeof exercises.$inferInsert;
```

- [ ] **Step 2: Generate the migration**

Run from repo root: `pnpm db:generate`

Expected: a new file `packages/db/drizzle/0013_<generated_name>.sql` is created containing four `ALTER TABLE "exercises" ADD COLUMN ...` statements (one per new column, no `NOT NULL`), and `packages/db/drizzle/meta/_journal.json` gains a new entry with `idx: 13`.

- [ ] **Step 3: Verify the generated SQL**

Run: `cat packages/db/drizzle/0013_*.sql`
Expected output contains exactly these four statements (order may vary, `--> statement-breakpoint` separators as in existing migrations):

```sql
ALTER TABLE "exercises" ADD COLUMN "instructions" text;
ALTER TABLE "exercises" ADD COLUMN "common_mistakes" text;
ALTER TABLE "exercises" ADD COLUMN "setup_notes" text;
ALTER TABLE "exercises" ADD COLUMN "video_url" text;
```

If any statement has `NOT NULL` or a `DEFAULT`, stop — the schema edit in Step 1 is wrong (a column was declared `.notNull()` by mistake).

- [ ] **Step 4: Add example content to 3 seeded exercises**

Edit `packages/db/src/seed.ts`. Replace the `Barbell Bench Press`, `Deadlift`, and `Back Squat` entries in `exerciseCatalog` (lines ~14-19, ~32-37, ~50-55) with:

```ts
  {
    name: 'Barbell Bench Press',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'barbell',
    description: 'Bar to mid-chest, elbows ~45°.',
    instructions:
      'Lie back on the bench with eyes under the bar. Grip just outside shoulder width, retract your shoulder blades, and plant your feet flat on the floor. Unrack the bar over your shoulders, lower it under control to mid-chest, then drive it back up in a straight line without losing shoulder blade contact with the bench.',
    commonMistakes:
      'Flaring elbows to 90°, bouncing the bar off the chest, letting the hips rise off the bench, and losing shoulder blade retraction partway through the set.',
    setupNotes:
      'Shoulder blades pulled back and down, slight arch in the lower back, feet planted firmly, bar path starts directly over the shoulders.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+bench+press+form+tutorial',
  },
```

```ts
  {
    name: 'Deadlift',
    muscleGroups: ['back', 'glutes', 'hamstrings'],
    equipment: 'barbell',
    description: 'Bar over midfoot, hinge at hips.',
    instructions:
      'Stand with the bar over midfoot, feet hip-width apart. Hinge at the hips and bend your knees to grip the bar just outside your shins. Brace your core, flatten your back, and drive through the floor with your legs while keeping the bar close to your body until you stand tall with hips fully extended.',
    commonMistakes:
      'Rounding the lower back, letting the bar drift away from the shins, hyperextending the lower back at lockout, and jerking the bar off the floor instead of driving with the legs.',
    setupNotes:
      'Bar over midfoot, shins near-vertical, flat back, hips higher than knees but lower than shoulders at the start.',
    videoUrl: 'https://www.youtube.com/results?search_query=deadlift+form+tutorial',
  },
```

```ts
  {
    name: 'Back Squat',
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    equipment: 'barbell',
    description: 'Hips below knees, knees track toes.',
    instructions:
      'Set the bar on your upper traps, unrack, and step back with feet shoulder-width apart, toes slightly turned out. Brace your core, break at the hips and knees together, and descend until your hip crease drops below your knee. Drive up through the whole foot, keeping your chest up and knees tracking over your toes.',
    commonMistakes:
      'Knees caving inward, heels rising off the floor, leaning too far forward, and stopping the descent above parallel.',
    setupNotes:
      'Bar resting on the upper traps (not the neck), feet shoulder-width, core braced before the first inch of descent.',
    videoUrl: 'https://www.youtube.com/results?search_query=back+squat+form+tutorial',
  },
```

Leave every other entry in `exerciseCatalog` unchanged — they keep only `name`, `muscleGroups`, `equipment`, `description`, and the four new columns stay `null` for those rows.

- [ ] **Step 5: Typecheck the db package**

Run: `pnpm --filter @acme/db typecheck`
Expected: passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/exercises.ts packages/db/src/seed.ts packages/db/drizzle/
git commit -m "feat(db): add exercise detail fields (instructions, common mistakes, setup notes, video url)"
```

---

### Task 2: Contract — schema fields and `getExercise` route

**Files:**
- Modify: `packages/contracts/src/schemas/exercise.schema.ts`
- Create: `packages/contracts/src/schemas/exercise.schema.test.ts`
- Modify: `packages/contracts/src/contracts/exercises.contract.ts`
- Modify: `packages/contracts/src/contracts/index.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (contracts package has no DB dependency); field names must match Task 1's column names (`instructions`, `commonMistakes`, `setupNotes`, `videoUrl`).
- Produces: `Exercise` type gains `instructions: string | null`, `commonMistakes: string | null`, `setupNotes: string | null`, `videoUrl: string | null`. New `exerciseIdParamsSchema` / `ExerciseIdParams` type. New contract route `contract.exercises.getExercise` (`GET /exercises/:id`, params `{ id }`, responses `200: exerciseSchema, 404: errorResponseSchema`). Task 3 and Task 5 depend on these exact names.

- [ ] **Step 1: Extend `exerciseSchema` and add `exerciseIdParamsSchema`**

Replace the full contents of `packages/contracts/src/schemas/exercise.schema.ts`:

```ts
import { z } from 'zod';

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  muscleGroups: z.array(z.string()),
  equipment: z.string(),
  description: z.string(),
  instructions: z.string().nullable(),
  commonMistakes: z.string().nullable(),
  setupNotes: z.string().nullable(),
  videoUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const listExercisesQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
});
export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;

export const exerciseIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type ExerciseIdParams = z.infer<typeof exerciseIdParamsSchema>;
```

- [ ] **Step 2: Write the schema test**

Create `packages/contracts/src/schemas/exercise.schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { exerciseIdParamsSchema, exerciseSchema } from './exercise.schema.js';

describe('exerciseSchema', () => {
  const base = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Barbell Bench Press',
    muscleGroups: ['chest'],
    equipment: 'barbell',
    description: 'Bar to mid-chest.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('accepts null detail fields', () => {
    const result = exerciseSchema.safeParse({
      ...base,
      instructions: null,
      commonMistakes: null,
      setupNotes: null,
      videoUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts populated detail fields', () => {
    const result = exerciseSchema.safeParse({
      ...base,
      instructions: 'Lower under control.',
      commonMistakes: 'Flaring elbows.',
      setupNotes: 'Shoulder blades retracted.',
      videoUrl: 'https://example.com/video',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing detail field', () => {
    const result = exerciseSchema.safeParse({
      ...base,
      instructions: null,
      commonMistakes: null,
      setupNotes: null,
      // videoUrl omitted
    });
    expect(result.success).toBe(false);
  });
});

describe('exerciseIdParamsSchema', () => {
  it('rejects a non-uuid id', () => {
    expect(exerciseIdParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('accepts a uuid id', () => {
    expect(
      exerciseIdParamsSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' }).success,
    ).toBe(true);
  });
});
```

- [ ] **Step 3: Run the schema test and verify it passes**

Run: `pnpm --filter @acme/contracts test exercise.schema.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 4: Add the `getExercise` route**

Replace the full contents of `packages/contracts/src/contracts/exercises.contract.ts`:

```ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  exerciseIdParamsSchema,
  exerciseSchema,
  listExercisesQuerySchema,
} from '../schemas/exercise.schema.js';

const c = initContract();

export const exercisesContract = c.router({
  listExercises: {
    method: 'GET',
    path: '/exercises',
    query: listExercisesQuerySchema,
    responses: { 200: z.array(exerciseSchema) },
    summary: 'List/search the global exercise catalog',
  },
  getExercise: {
    method: 'GET',
    path: '/exercises/:id',
    pathParams: exerciseIdParamsSchema,
    responses: {
      200: exerciseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a single exercise with full detail content',
  },
});
```

- [ ] **Step 5: Extend the contract index test**

In `packages/contracts/src/contracts/index.test.ts`, add a new `it` inside the existing `describe('contract', ...)` block (after the `'exposes the auth routes'` test):

```ts
  it('exposes the exercises routes', () => {
    expect(contract.exercises.listExercises.path).toBe('/exercises');
    expect(contract.exercises.getExercise.method).toBe('GET');
    expect(contract.exercises.getExercise.path).toBe('/exercises/:id');
  });
```

- [ ] **Step 6: Run the contracts test suite and typecheck**

Run: `pnpm --filter @acme/contracts test && pnpm --filter @acme/contracts typecheck`
Expected: all tests PASS, typecheck has no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/schemas/exercise.schema.ts packages/contracts/src/schemas/exercise.schema.test.ts packages/contracts/src/contracts/exercises.contract.ts packages/contracts/src/contracts/index.test.ts
git commit -m "feat(contracts): add exercise detail fields and getExercise route"
```

---

### Task 3: API — repository, service, controller

**Files:**
- Modify: `apps/api/src/modules/exercises/exercises.repository.ts`
- Modify: `apps/api/src/modules/exercises/exercises.service.ts`
- Modify: `apps/api/src/modules/exercises/exercises.controller.ts`
- Create: `apps/api/src/modules/exercises/exercises.service.spec.ts`

**Interfaces:**
- Consumes: `Exercise` type and `contract.exercises.getExercise` from Task 2; `ExerciseRow` from `@acme/db` (Task 1).
- Produces: `ExercisesRepository.findById(id: string): Promise<ExerciseRow | undefined>`, `ExercisesService.getExercise(id: string): Promise<Exercise | undefined>`. Task 5 (web) consumes the resulting HTTP route only, not these directly.

- [ ] **Step 1: Add `findById` to the repository**

Replace the full contents of `apps/api/src/modules/exercises/exercises.repository.ts`:

```ts
import type { Database, ExerciseRow } from '@acme/db';
import { exercises } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, ilike } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

@Injectable()
export class ExercisesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(search?: string): Promise<ExerciseRow[]> {
    return this.db
      .select()
      .from(exercises)
      .where(search ? ilike(exercises.name, `%${search}%`) : undefined)
      .orderBy(asc(exercises.name));
  }

  async findById(id: string): Promise<ExerciseRow | undefined> {
    const [row] = await this.db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
    return row;
  }
}
```

- [ ] **Step 2: Add `getExercise` to the service**

Replace the full contents of `apps/api/src/modules/exercises/exercises.service.ts`:

```ts
import type { Exercise } from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { ExercisesRepository } from './exercises.repository.js';

@Injectable()
export class ExercisesService {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async list(search?: string): Promise<Exercise[]> {
    return this.exercisesRepository.list(search);
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    return this.exercisesRepository.findById(id);
  }
}
```

- [ ] **Step 3: Write the service spec**

Create `apps/api/src/modules/exercises/exercises.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { ExercisesRepository } from './exercises.repository.js';
import { ExercisesService } from './exercises.service.js';

function createRepositoryMock(overrides: Partial<ExercisesRepository> = {}): ExercisesRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    ...overrides,
  } as unknown as ExercisesRepository;
}

describe('ExercisesService', () => {
  it('returns the exercise when found', async () => {
    const now = new Date();
    const exercise = {
      id: '1',
      name: 'Barbell Bench Press',
      muscleGroups: ['chest'],
      equipment: 'barbell',
      description: 'Bar to mid-chest.',
      instructions: null,
      commonMistakes: null,
      setupNotes: null,
      videoUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    const repository = createRepositoryMock({ findById: vi.fn().mockResolvedValue(exercise) });
    const service = new ExercisesService(repository);

    await expect(service.getExercise('1')).resolves.toEqual(exercise);
  });

  it('returns undefined when the exercise is not found', async () => {
    const repository = createRepositoryMock({ findById: vi.fn().mockResolvedValue(undefined) });
    const service = new ExercisesService(repository);

    await expect(service.getExercise('missing')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4: Run the test and verify it fails first, then passes**

Run: `pnpm --filter @acme/api test exercises.service.spec.ts`

Before Steps 1-2 are saved this would fail with `findById is not a function` — since Steps 1-2 are already applied by this point in the task, instead just run the test now and confirm:
Expected: both tests PASS.

- [ ] **Step 5: Add the `getExercise` handler to the controller**

Replace the full contents of `apps/api/src/modules/exercises/exercises.controller.ts`:

```ts
import { contract } from '@acme/contracts';
import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ExercisesService } from './exercises.service.js';

const exercisesContract = contract.exercises;

@Controller()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @TsRestHandler(exercisesContract)
  async handler() {
    return tsRestHandler(exercisesContract, {
      listExercises: async ({ query }) => {
        const items = await this.exercisesService.list(query.search);
        return { status: 200, body: items };
      },
      getExercise: async ({ params }) => {
        const exercise = await this.exercisesService.getExercise(params.id);
        if (!exercise) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 200, body: exercise };
      },
    });
  }
}
```

- [ ] **Step 6: Typecheck and run the full api test suite**

Run: `pnpm --filter @acme/api typecheck && pnpm --filter @acme/api test`
Expected: typecheck has no errors, all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/exercises/
git commit -m "feat(api): add getExercise endpoint"
```

---

### Task 4: i18n — detail page copy

**Files:**
- Modify: `apps/web/src/shared/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/shared/i18n/dictionaries/pl.ts`

**Interfaces:**
- Produces: `dict.exercises.viewDetails`, `dict.exercises.howToPerform`, `dict.exercises.commonMistakes`, `dict.exercises.setupPosition`, `dict.exercises.watchDemo` (all `string`). Task 5 depends on these exact key names.

- [ ] **Step 1: Add the English keys**

In `apps/web/src/shared/i18n/dictionaries/en.ts`, replace:

```ts
  exercises: {
    title: 'Exercise Library',
  },
```

with:

```ts
  exercises: {
    title: 'Exercise Library',
    viewDetails: 'View exercise details',
    howToPerform: 'How to perform it',
    commonMistakes: 'Common mistakes',
    setupPosition: 'Setup & position',
    watchDemo: 'Watch a demo',
  },
```

- [ ] **Step 2: Add the matching Polish keys**

In `apps/web/src/shared/i18n/dictionaries/pl.ts`, replace:

```ts
  exercises: {
    title: 'Biblioteka ćwiczeń',
  },
```

with:

```ts
  exercises: {
    title: 'Biblioteka ćwiczeń',
    viewDetails: 'Zobacz szczegóły ćwiczenia',
    howToPerform: 'Jak wykonać poprawnie',
    commonMistakes: 'Częste błędy',
    setupPosition: 'Pozycja wyjściowa',
    watchDemo: 'Obejrzyj film instruktażowy',
  },
```

- [ ] **Step 3: Typecheck the web package**

Run: `pnpm --filter @acme/web typecheck`
Expected: no errors (this is the check that `pl.ts` matches the `Dictionary` type inferred from `en.ts`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/i18n/dictionaries/en.ts apps/web/src/shared/i18n/dictionaries/pl.ts
git commit -m "feat(web): add exercise detail page copy (en/pl)"
```

---

### Task 5: Web — detail page, component, and catalog button

**Files:**
- Create: `apps/web/src/features/exercises/components/exercise-detail.tsx`
- Modify: `apps/web/src/features/exercises/index.ts`
- Create: `apps/web/src/app/exercises/[id]/page.tsx`
- Modify: `apps/web/src/app/exercises/page.tsx`

**Interfaces:**
- Consumes: `Exercise` type and `apiClient.exercises.getExercise` (Task 2/3), `dict.exercises.*` (Task 4), `EquipmentIcon` (existing, `@/features/exercises`).
- Produces: `ExerciseDetail({ exercise }: { exercise: Exercise })` component; route `/exercises/[id]`.

- [ ] **Step 1: Create the `ExerciseDetail` component**

Create `apps/web/src/features/exercises/components/exercise-detail.tsx`:

```tsx
import type { Exercise } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { EquipmentIcon } from './equipment-icon';
import type { Dictionary } from '@/shared/i18n/dictionary';

export function ExerciseDetail({ exercise, dict }: { exercise: Exercise; dict: Dictionary }) {
  return (
    <Stack gap="lg" className="pb-24">
      <Link
        href="/exercises"
        className="text-muted-foreground hover:text-primary flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.exercises.title}
      </Link>

      <Stack direction="row" gap="sm" align="center">
        <span className="bg-secondary text-secondary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <EquipmentIcon equipment={exercise.equipment} className="h-6 w-6" />
        </span>
        <Stack gap="none" className="min-w-0 flex-1">
          <Text variant="heading" className="font-display text-primary block uppercase">
            {exercise.name}
          </Text>
          <Text tone="muted" variant="caption" className="font-data block">
            {exercise.description}
          </Text>
        </Stack>
      </Stack>

      <Stack direction="row" gap="xs" className="flex-wrap">
        {exercise.muscleGroups.map((group) => (
          <span
            key={group}
            className="bg-primary/15 text-primary font-data rounded-full px-2 py-0.5 text-xs uppercase"
          >
            {group}
          </span>
        ))}
      </Stack>

      {exercise.instructions && (
        <Card className="glass-panel">
          <Text variant="subheading" className="font-display mb-2 block text-lg uppercase">
            {dict.exercises.howToPerform}
          </Text>
          <Text variant="body">{exercise.instructions}</Text>
        </Card>
      )}

      {exercise.setupNotes && (
        <Card className="glass-panel">
          <Text variant="subheading" className="font-display mb-2 block text-lg uppercase">
            {dict.exercises.setupPosition}
          </Text>
          <Text variant="body">{exercise.setupNotes}</Text>
        </Card>
      )}

      {exercise.commonMistakes && (
        <Card className="glass-panel">
          <Text variant="subheading" className="font-display mb-2 block text-lg uppercase">
            {dict.exercises.commonMistakes}
          </Text>
          <Text variant="body">{exercise.commonMistakes}</Text>
        </Card>
      )}

      {exercise.videoUrl && (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary self-start text-sm underline underline-offset-2"
        >
          {dict.exercises.watchDemo}
        </a>
      )}
    </Stack>
  );
}
```

Note: this imports `EquipmentIcon` by relative path (`./equipment-icon`) rather than via the feature's own barrel, to avoid a self-import through `@/features/exercises` from inside the same feature.

- [ ] **Step 2: Export it from the feature barrel**

In `apps/web/src/features/exercises/index.ts`, replace:

```ts
export { EquipmentIcon } from './components/equipment-icon';
```

with:

```ts
export { EquipmentIcon } from './components/equipment-icon';
export { ExerciseDetail } from './components/exercise-detail';
```

- [ ] **Step 3: Create the detail page route**

Create `apps/web/src/app/exercises/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { ExerciseDetail } from '@/features/exercises';
import { getServerApiClient } from '@/shared/api/api-server';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function ExerciseDetailPage({ params }: PageProps<'/exercises/[id]'>) {
  const dict = await getServerDictionary();
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.exercises.getExercise({ params: { id } });

  if (result.status === 404) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <ExerciseDetail exercise={result.body} dict={dict} />
    </main>
  );
}
```

- [ ] **Step 4: Add the button to each catalog row**

In `apps/web/src/app/exercises/page.tsx`, add the import and wrap the muscle-group badges' sibling with a link button. Change:

```tsx
import { Card, Input, Stack, Text } from '@acme/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EquipmentIcon } from '@/features/exercises';
```

to:

```tsx
import { Card, Input, Stack, Text } from '@acme/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EquipmentIcon } from '@/features/exercises';
```

Then change the row's closing `Stack` (the muscle-group badges) block from:

```tsx
                <Stack direction="row" gap="xs" className="shrink-0 flex-wrap justify-end">
                  {exercise.muscleGroups.map((group) => (
                    <span
                      key={group}
                      className="bg-primary/15 text-primary font-data rounded-full px-2 py-0.5 text-xs uppercase"
                    >
                      {group}
                    </span>
                  ))}
                </Stack>
              </Stack>
            </Card>
```

to:

```tsx
                <Stack direction="row" gap="xs" className="shrink-0 flex-wrap justify-end">
                  {exercise.muscleGroups.map((group) => (
                    <span
                      key={group}
                      className="bg-primary/15 text-primary font-data rounded-full px-2 py-0.5 text-xs uppercase"
                    >
                      {group}
                    </span>
                  ))}
                </Stack>
                <Link
                  href={`/exercises/${exercise.id}`}
                  aria-label={dict.exercises.viewDetails}
                  className="text-muted-foreground hover:text-primary hover:bg-accent shrink-0 rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Stack>
            </Card>
```

- [ ] **Step 5: Typecheck, lint, and build the web package**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: no errors.

- [ ] **Step 6: Manual verification with the dev server**

Run: `pnpm docker:up` (if the local Postgres isn't already running), then from repo root: `pnpm db:migrate && pnpm db:seed` to apply Task 1's migration and load the example content, then `pnpm dev`.

In a browser:
1. Open `/exercises`. Confirm each row now shows a chevron button on the right.
2. Click the chevron on "Barbell Bench Press". Confirm `/exercises/<id>` loads showing name, equipment icon, muscle group badges, "How to perform it", "Setup & position", "Common mistakes" sections, and a "Watch a demo" link that opens in a new tab.
3. Click the chevron on an exercise with no seeded detail content (e.g. "Push-Up"). Confirm the page loads with just the header/badges and no empty section headers (sections are conditionally omitted).
4. Navigate to `/exercises/00000000-0000-0000-0000-000000000000` directly. Confirm the Next.js not-found page renders (404).
5. Click "Exercise Library" back-link on a detail page. Confirm it returns to `/exercises`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/exercises/ apps/web/src/app/exercises/
git commit -m "feat(web): add per-exercise detail page with catalog link button"
```

---

## Self-Review Notes

- Spec coverage: schema fields (Task 1), API route (Tasks 2-3), catalog button (Task 5 Step 4), detail page with all four content sections + video link (Task 5 Steps 1-3), i18n (Task 4), example content for 3 exercises (Task 1 Step 4), unit tests for the new service method and schema (Tasks 2-3) — all spec requirements have a task.
- No placeholders: every step has literal code or literal shell commands.
- Type consistency checked: `findById` (repository) → `getExercise` (service) → `getExercise` (contract/controller) use the same `id: string` parameter and `Exercise | undefined` / `ExerciseRow | undefined` return shape throughout; dictionary key names (`viewDetails`, `howToPerform`, `commonMistakes`, `setupPosition`, `watchDemo`) are identical between Task 4's definitions and Task 5's usage.
