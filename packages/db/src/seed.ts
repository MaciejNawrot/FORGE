import './load-env.js';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env.js';
import { user } from './schema/auth.js';
import { exercises } from './schema/exercises.js';
import { users } from './schema/users.js';
import { workoutExercises, workoutPlans } from './schema/workouts.js';

const SYSTEM_USER_ID = 'system';

const exerciseCatalog = [
  {
    name: 'Barbell Bench Press',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'barbell',
    description: 'Bar to mid-chest, elbows ~45°.',
  },
  {
    name: 'Dumbbell Incline Press',
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    equipment: 'dumbbell',
    description: 'Bench at 30°, press up and slightly in.',
  },
  {
    name: 'Push-Up',
    muscleGroups: ['chest', 'triceps', 'core'],
    equipment: 'bodyweight',
    description: 'Straight line head to heels.',
  },
  {
    name: 'Deadlift',
    muscleGroups: ['back', 'glutes', 'hamstrings'],
    equipment: 'barbell',
    description: 'Bar over midfoot, hinge at hips.',
  },
  {
    name: 'Lat Pulldown',
    muscleGroups: ['back', 'biceps'],
    equipment: 'cable',
    description: 'Pull to upper chest, squeeze shoulder blades.',
  },
  {
    name: 'Pull-Up',
    muscleGroups: ['back', 'biceps'],
    equipment: 'bodyweight',
    description: 'Chin over bar, full hang at bottom.',
  },
  {
    name: 'Back Squat',
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    equipment: 'barbell',
    description: 'Hips below knees, knees track toes.',
  },
  {
    name: 'Leg Press',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'machine',
    description: "Feet shoulder-width, don't lock knees.",
  },
  {
    name: 'Bodyweight Lunge',
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    equipment: 'bodyweight',
    description: 'Front knee over ankle, torso upright.',
  },
  {
    name: 'Overhead Press',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: 'barbell',
    description: 'Bar path close to face, brace core.',
  },
  {
    name: 'Dumbbell Lateral Raise',
    muscleGroups: ['shoulders'],
    equipment: 'dumbbell',
    description: 'Raise to shoulder height, slight elbow bend.',
  },
  {
    name: 'Cable Face Pull',
    muscleGroups: ['shoulders', 'back'],
    equipment: 'cable',
    description: 'Pull to forehead, rotate shoulders back.',
  },
  {
    name: 'Barbell Curl',
    muscleGroups: ['biceps'],
    equipment: 'barbell',
    description: 'Elbows pinned to sides.',
  },
  {
    name: 'Dumbbell Hammer Curl',
    muscleGroups: ['biceps', 'forearms'],
    equipment: 'dumbbell',
    description: 'Neutral grip, controlled negative.',
  },
  {
    name: 'Cable Triceps Pushdown',
    muscleGroups: ['triceps'],
    equipment: 'cable',
    description: 'Elbows fixed, full extension.',
  },
  {
    name: 'Plank',
    muscleGroups: ['core'],
    equipment: 'bodyweight',
    description: 'Ribs down, glutes squeezed.',
  },
  {
    name: 'Cable Woodchop',
    muscleGroups: ['core', 'shoulders'],
    equipment: 'cable',
    description: 'Rotate from the hips, not just arms.',
  },
  {
    name: 'Hanging Leg Raise',
    muscleGroups: ['core'],
    equipment: 'bodyweight',
    description: 'Curl pelvis up, avoid swinging.',
  },
] as const;

const planTemplates = [
  {
    name: 'Push Day',
    notes: 'Chest, shoulders, triceps.',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: 8, weightKg: 60 },
      { name: 'Dumbbell Incline Press', sets: 3, reps: 10, weightKg: 20 },
      { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 40 },
      { name: 'Cable Triceps Pushdown', sets: 3, reps: 12, weightKg: 25 },
    ],
  },
  {
    name: 'Pull Day',
    notes: 'Back, biceps.',
    exercises: [
      { name: 'Deadlift', sets: 3, reps: 5, weightKg: 100 },
      { name: 'Lat Pulldown', sets: 3, reps: 10, weightKg: 50 },
      { name: 'Barbell Curl', sets: 3, reps: 10, weightKg: 30 },
      { name: 'Cable Face Pull', sets: 3, reps: 15, weightKg: 15 },
    ],
  },
  {
    name: 'Leg Day',
    notes: 'Quads, glutes, hamstrings.',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 8, weightKg: 80 },
      { name: 'Leg Press', sets: 3, reps: 12, weightKg: 120 },
      { name: 'Bodyweight Lunge', sets: 3, reps: 10, weightKg: null },
    ],
  },
] as const;

async function main() {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, {
    schema: { users, user, exercises, workoutPlans, workoutExercises },
  });

  console.log('Seeding database...');

  await db
    .insert(users)
    .values([
      { email: 'ada@example.com', name: 'Ada Lovelace' },
      { email: 'grace@example.com', name: 'Grace Hopper' },
    ])
    .onConflictDoNothing();

  await db
    .insert(user)
    .values({ id: SYSTEM_USER_ID, name: 'GYM0', email: 'system@gym0.local', emailVerified: true })
    .onConflictDoNothing();

  await db
    .insert(exercises)
    .values(
      exerciseCatalog.map((exercise) => ({
        ...exercise,
        muscleGroups: [...exercise.muscleGroups],
      })),
    )
    .onConflictDoNothing();

  for (const template of planTemplates) {
    const [existing] = await db
      .select({ id: workoutPlans.id })
      .from(workoutPlans)
      .where(and(eq(workoutPlans.name, template.name), eq(workoutPlans.isTemplate, true)))
      .limit(1);
    if (existing) continue;

    const [plan] = await db
      .insert(workoutPlans)
      .values({
        userId: SYSTEM_USER_ID,
        name: template.name,
        notes: template.notes,
        isTemplate: true,
      })
      .returning();
    if (!plan) throw new Error(`Failed to seed template "${template.name}"`);

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
  }

  console.log('Seed complete.');

  await client.end();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
