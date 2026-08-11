import { relations } from 'drizzle-orm';
import { date, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { exercises } from './exercises.js';

/** Fixed, color-coded training types shown on the tracker heatmap. */
export const trainingTypes = ['strength', 'cardio', 'mobility', 'rest'] as const;
export type TrainingType = (typeof trainingTypes)[number];

export const trainingSessions = pgTable(
  'training_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
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
