# Exercise Detail Page — Design

## Problem

The `/exercises` catalog page shows only name, short cue (`description`), equipment icon, and muscle groups. Users have no way to see a longer explanation of how to perform an exercise, common mistakes to avoid, positioning/setup guidance, or a link to a demonstration video/photo.

## Goals

- Each exercise on `/exercises` gets a button that opens its own detail page.
- The detail page shows: longer description of how to perform the exercise correctly, common mistakes, setup/position notes, and an optional link to a demonstration video or photo.
- Feature is wired end-to-end (schema → API → UI); real content is seeded for a few example exercises, not all ~54.

## Non-goals

- No file/image upload or CDN — video/photo is a plain external URL.
- No changes to how exercises are displayed inside plan or session views (`exercise-row.tsx`, `exercise-log-card.tsx`, `exercise-picker.tsx`) — those stay as-is.
- No dropdown/kebab menu — the button is a single action (navigate to detail page).
- No content-writing pass for the full seeded catalog.

## Data model

Add four nullable `text` columns to `exercises` (`packages/db/src/schema/exercises.ts`):

- `instructions` — longer step-by-step description of correct execution.
- `commonMistakes` — common form errors to avoid.
- `setupNotes` — starting position / setup cues.
- `videoUrl` — external link to a demonstration video or photo.

Nullable because content is backfilled incrementally; the existing `description` column keeps its current role as the short list-view cue and is unchanged.

Migration generated via `pnpm --filter @acme/db db:generate` (drizzle-kit), following the existing numbered-migration convention in `packages/db/drizzle/`.

## API

- `exerciseSchema` (`packages/contracts/src/schemas/exercise.schema.ts`) gains the four fields as `z.string().nullable()`.
- New contract route `getExercise: GET /exercises/:id` (`packages/contracts/src/contracts/exercises.contract.ts`), params `{ id: z.string().uuid() }`, responses `{ 200: exerciseSchema, 404: z.object({ message: z.string() }) }` — mirrors the existing `getPlan` shape in the workouts contract.
- `ExercisesController` / `ExercisesService` / `ExercisesRepository` gain a `getExercise(id)` path: repository does `select().where(eq(exercises.id, id))`, service returns the row or `undefined`, controller returns 404 when not found (same pattern as `PlansController`).

## Web

- `apps/web/src/app/exercises/page.tsx`: each `Card` row gets a small icon button (`lucide-react` chevron, consistent with existing icon usage) wrapped in a Next.js `Link` to `/exercises/[id]`.
- New route `apps/web/src/app/exercises/[id]/page.tsx`, server component matching the shape of `apps/web/src/app/plans/[id]/page.tsx`:
  - Fetch via `getServerApiClient().exercises.getExercise({ params: { id } })`.
  - `notFound()` on 404.
  - Render a new `ExerciseDetail` component (`apps/web/src/features/exercises/components/exercise-detail.tsx`) exported from the feature's `index.ts`.
- `ExerciseDetail` renders: header (name, equipment icon, muscle group badges), short cue, then labeled sections for "How to perform it" (instructions), "Common mistakes", "Setup & position" (setupNotes) — each section omitted entirely when its field is `null`. If `videoUrl` is present, render it as an external link (opens in new tab).

## i18n

Add section labels to `apps/web/src/shared/i18n/dictionaries/en.ts` and `pl.ts` under the `exercises` key: e.g. `howToPerform`, `commonMistakes`, `setupPosition`, `watchDemo`.

## Seed data

`packages/db/src/seed.ts`: add `instructions` / `commonMistakes` / `setupNotes` / `videoUrl` for 3 example exercises (Barbell Bench Press, Deadlift, Back Squat). All other catalog entries leave these fields undefined (`null` in DB).

## Testing

- API: unit test for `ExercisesService.getExercise` (found / not-found cases), matching existing test style for the module if present.
- Web: no new test infra beyond what the repo already has for similar detail pages — manual verification via dev server (`/exercises` → click through to `/exercises/[id]`, confirm sections render/omit correctly, confirm 404 for bad id).
