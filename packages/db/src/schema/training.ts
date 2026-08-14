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
