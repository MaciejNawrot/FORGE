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
