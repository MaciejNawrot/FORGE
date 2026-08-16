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
    instructions:
      'Lie back on the bench with eyes under the bar. Grip just outside shoulder width, retract your shoulder blades, and plant your feet flat on the floor. Unrack the bar over your shoulders, lower it under control to mid-chest, then drive it back up in a straight line without losing shoulder blade contact with the bench.',
    commonMistakes:
      'Flaring elbows to 90°, bouncing the bar off the chest, letting the hips rise off the bench, and losing shoulder blade retraction partway through the set.',
    setupNotes:
      'Shoulder blades pulled back and down, slight arch in the lower back, feet planted firmly, bar path starts directly over the shoulders.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+bench+press+form+tutorial',
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
    instructions:
      'Stand with the bar over midfoot, feet hip-width apart. Hinge at the hips and bend your knees to grip the bar just outside your shins. Brace your core, flatten your back, and drive through the floor with your legs while keeping the bar close to your body until you stand tall with hips fully extended.',
    commonMistakes:
      'Rounding the lower back, letting the bar drift away from the shins, hyperextending the lower back at lockout, and jerking the bar off the floor instead of driving with the legs.',
    setupNotes:
      'Bar over midfoot, shins near-vertical, flat back, hips higher than knees but lower than shoulders at the start.',
    videoUrl: 'https://www.youtube.com/results?search_query=deadlift+form+tutorial',
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
    instructions:
      'Set the bar on your upper traps, unrack, and step back with feet shoulder-width apart, toes slightly turned out. Brace your core, break at the hips and knees together, and descend until your hip crease drops below your knee. Drive up through the whole foot, keeping your chest up and knees tracking over your toes.',
    commonMistakes:
      'Knees caving inward, heels rising off the floor, leaning too far forward, and stopping the descent above parallel.',
    setupNotes:
      'Bar resting on the upper traps (not the neck), feet shoulder-width, core braced before the first inch of descent.',
    videoUrl: 'https://www.youtube.com/results?search_query=back+squat+form+tutorial',
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
  {
    name: 'Barbell Row',
    muscleGroups: ['back', 'biceps'],
    equipment: 'barbell',
    description: 'Hinge at hips, pull to lower ribs.',
  },
  {
    name: 'Seated Cable Row',
    muscleGroups: ['back', 'biceps'],
    equipment: 'cable',
    description: 'Chest up, pull to torso, squeeze back.',
  },
  {
    name: 'T-Bar Row',
    muscleGroups: ['back', 'biceps'],
    equipment: 'machine',
    description: 'Chest against pad, row to sternum.',
  },
  {
    name: 'Single-Arm Dumbbell Row',
    muscleGroups: ['back', 'biceps'],
    equipment: 'dumbbell',
    description: 'Flat back, pull elbow past torso.',
  },
  {
    name: 'Dumbbell Flat Bench Press',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'dumbbell',
    description: 'Press up and slightly in, control the descent.',
  },
  {
    name: 'Cable Chest Fly',
    muscleGroups: ['chest'],
    equipment: 'cable',
    description: 'Slight elbow bend, squeeze at midline.',
  },
  {
    name: 'Dip',
    muscleGroups: ['chest', 'triceps'],
    equipment: 'bodyweight',
    description: 'Lean forward for chest, torso upright for triceps.',
  },
  {
    name: 'Romanian Deadlift',
    muscleGroups: ['hamstrings', 'glutes', 'back'],
    equipment: 'barbell',
    description: 'Soft knees, hinge back until hamstrings stretch.',
  },
  {
    name: 'Leg Curl',
    muscleGroups: ['hamstrings'],
    equipment: 'machine',
    description: 'Curl heels to glutes, control the negative.',
  },
  {
    name: 'Leg Extension',
    muscleGroups: ['quads'],
    equipment: 'machine',
    description: 'Extend fully, pause, lower slow.',
  },
  {
    name: 'Bulgarian Split Squat',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'dumbbell',
    description: 'Rear foot elevated, front knee tracks toes.',
  },
  {
    name: 'Hip Thrust',
    muscleGroups: ['glutes', 'hamstrings'],
    equipment: 'barbell',
    description: 'Shoulders on bench, drive hips up, squeeze glutes.',
  },
  {
    name: 'Standing Calf Raise',
    muscleGroups: ['calves'],
    equipment: 'machine',
    description: 'Full stretch at bottom, pause at top.',
  },
  {
    name: 'Front Squat',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'barbell',
    description: 'Bar on front delts, elbows high, torso upright.',
  },
  {
    name: 'Goblet Squat',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'dumbbell',
    description: 'Hold weight at chest, squat between knees.',
  },
  {
    name: 'Arnold Press',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    description: 'Rotate palms out as you press overhead.',
  },
  {
    name: 'Dumbbell Shoulder Press',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    description: 'Press overhead, avoid flaring elbows past 90°.',
  },
  {
    name: 'Front Raise',
    muscleGroups: ['shoulders'],
    equipment: 'dumbbell',
    description: 'Raise to eye level, slight elbow bend.',
  },
  {
    name: 'Barbell Shrug',
    muscleGroups: ['traps'],
    equipment: 'barbell',
    description: 'Shrug straight up, no rolling.',
  },
  {
    name: 'Preacher Curl',
    muscleGroups: ['biceps'],
    equipment: 'barbell',
    description: 'Arms on pad, avoid locking out at bottom.',
  },
  {
    name: 'Skull Crusher',
    muscleGroups: ['triceps'],
    equipment: 'barbell',
    description: 'Lower bar to forehead, elbows fixed.',
  },
  {
    name: 'Close-Grip Bench Press',
    muscleGroups: ['triceps', 'chest'],
    equipment: 'barbell',
    description: 'Hands shoulder-width, elbows tucked.',
  },
  {
    name: 'Concentration Curl',
    muscleGroups: ['biceps'],
    equipment: 'dumbbell',
    description: 'Elbow braced on inner thigh, full range.',
  },
  {
    name: 'EZ-Bar Curl',
    muscleGroups: ['biceps'],
    equipment: 'barbell',
    description: 'Angled grip, elbows pinned to sides.',
  },
  {
    name: 'Russian Twist',
    muscleGroups: ['core'],
    equipment: 'bodyweight',
    description: 'Rotate torso side to side, feet lifted.',
  },
  {
    name: 'Sit-Up',
    muscleGroups: ['core'],
    equipment: 'bodyweight',
    description: 'Curl spine up, feet anchored.',
  },
  {
    name: 'Mountain Climber',
    muscleGroups: ['core'],
    equipment: 'bodyweight',
    description: 'Drive knees to chest in plank position, stay fast.',
  },
  {
    name: 'Ab Wheel Rollout',
    muscleGroups: ['core'],
    equipment: 'ab wheel',
    description: 'Roll out until near-flat, brace and pull back.',
  },
  {
    name: 'Cable Crunch',
    muscleGroups: ['core'],
    equipment: 'cable',
    description: 'Kneel, crunch elbows toward knees.',
  },
  {
    name: 'Kettlebell Swing',
    muscleGroups: ['glutes', 'hamstrings', 'core'],
    equipment: 'kettlebell',
    description: 'Hip-hinge power, arms just along for the ride.',
  },
  {
    name: "Farmer's Carry",
    muscleGroups: ['forearms', 'core'],
    equipment: 'dumbbell',
    description: 'Walk tall, shoulders back, grip tight.',
  },
  {
    name: 'Burpee',
    muscleGroups: ['full body'],
    equipment: 'bodyweight',
    description: 'Squat, kick back to plank, push up, jump.',
  },
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

const planTemplates = [
  {
    name: 'Push Day',
    notes: 'Chest, shoulders, triceps.',
    category: 'strength',
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
    category: 'strength',
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
    category: 'strength',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 8, weightKg: 80 },
      { name: 'Leg Press', sets: 3, reps: 12, weightKg: 120 },
      { name: 'Bodyweight Lunge', sets: 3, reps: 10, weightKg: null },
    ],
  },
  {
    name: 'Engine Builder',
    notes: 'Steady-state conditioning intervals.',
    category: 'cardio',
    exercises: [
      { name: 'Interval Sprints', sets: 8, reps: 1, weightKg: null },
      { name: 'Rowing Intervals', sets: 6, reps: 1, weightKg: null },
      { name: 'Bike Sprints', sets: 6, reps: 1, weightKg: null },
    ],
  },
  {
    name: 'Metabolic Circuit',
    notes: 'Bodyweight HIIT circuit, minimal rest between rounds.',
    category: 'cardio',
    exercises: [
      { name: 'Push-Up', sets: 5, reps: 15, weightKg: null },
      { name: 'Bodyweight Lunge', sets: 5, reps: 20, weightKg: null },
      { name: 'Plank', sets: 5, reps: 1, weightKg: null },
      { name: 'Hanging Leg Raise', sets: 5, reps: 12, weightKg: null },
    ],
  },
  {
    name: 'Mobility Flow',
    notes: 'Full-body stretch and joint mobility routine.',
    category: 'mobility',
    exercises: [
      { name: 'Plank', sets: 3, reps: 1, weightKg: null },
      { name: 'Bodyweight Lunge', sets: 3, reps: 10, weightKg: null },
      { name: 'Cable Woodchop', sets: 3, reps: 12, weightKg: null },
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

  const catalogRows = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
  const exerciseIdByName = new Map(catalogRows.map((row) => [row.name.toLowerCase(), row.id]));

  function buildExerciseRows(planId: string, template: (typeof planTemplates)[number]) {
    return template.exercises.map((exercise, index) => {
      const exerciseId = exerciseIdByName.get(exercise.name.toLowerCase());
      if (!exerciseId) {
        throw new Error(
          `Seed template "${template.name}" references unknown exercise "${exercise.name}"`,
        );
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

  for (const template of planTemplates) {
    const [existing] = await db
      .select({ id: workoutPlans.id })
      .from(workoutPlans)
      .where(and(eq(workoutPlans.name, template.name), eq(workoutPlans.isTemplate, true)))
      .limit(1);
    if (existing) {
      await db
        .update(workoutPlans)
        .set({ category: template.category })
        .where(eq(workoutPlans.id, existing.id));
      await db.delete(workoutExercises).where(eq(workoutExercises.planId, existing.id));
      await db.insert(workoutExercises).values(buildExerciseRows(existing.id, template));
      continue;
    }

    const [plan] = await db
      .insert(workoutPlans)
      .values({
        userId: SYSTEM_USER_ID,
        name: template.name,
        notes: template.notes,
        category: template.category,
        isTemplate: true,
      })
      .returning();
    if (!plan) throw new Error(`Failed to seed template "${template.name}"`);

    await db.insert(workoutExercises).values(buildExerciseRows(plan.id, template));
  }

  console.log('Seed complete.');

  await client.end();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
