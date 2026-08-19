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

export const workoutPlans = pgTable(
  'workout_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    notes: text('notes'),
    // Reuses the training-session type enum for the library's category filter.
    category: text('category', { enum: trainingTypes }),
    // Global, browsable routines seeded into the app — not owned by any one
    // user's "my plans" list. Forking copies one into a real user-owned plan.
    isTemplate: boolean('is_template').notNull().default(false),
    forkedFromId: uuid('forked_from_id').references((): AnyPgColumn => workoutPlans.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('workout_plans_userId_idx').on(table.userId)],
);

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => workoutPlans.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    sets: integer('sets').notNull(),
    reps: integer('reps').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
    position: integer('position').notNull(),
    // Shared tag: two rows with the same non-null value are paired into a
    // superset. Not a FK — exactly-2-per-group is enforced by the API layer.
    pairGroupId: uuid('pair_group_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('workout_exercises_planId_idx').on(table.planId),
    index('workout_exercises_planId_pairGroupId_idx').on(table.planId, table.pairGroupId),
  ],
);

export const workoutPlanRelations = relations(workoutPlans, ({ many }) => ({
  exercises: many(workoutExercises),
}));

export const workoutExerciseRelations = relations(workoutExercises, ({ one }) => ({
  plan: one(workoutPlans, {
    fields: [workoutExercises.planId],
    references: [workoutPlans.id],
  }),
}));

export type WorkoutPlanRow = typeof workoutPlans.$inferSelect;
export type NewWorkoutPlanRow = typeof workoutPlans.$inferInsert;
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect;
export type NewWorkoutExerciseRow = typeof workoutExercises.$inferInsert;
