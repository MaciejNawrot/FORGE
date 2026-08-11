export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';
export type Equipment = 'barbell' | 'dumbbell' | 'bodyweight' | 'machine' | 'cable';

export type LibraryExercise = {
  name: string;
  equipment: Equipment;
  cue: string;
  example: string;
};

export const exerciseLibrary: Record<MuscleGroup, LibraryExercise[]> = {
  chest: [
    {
      name: 'Barbell Bench Press',
      equipment: 'barbell',
      cue: 'Bar to mid-chest, elbows ~45°',
      example: '3 × 6–8',
    },
    {
      name: 'Dumbbell Incline Press',
      equipment: 'dumbbell',
      cue: 'Bench at 30°, press up and slightly in',
      example: '3 × 8–12',
    },
    {
      name: 'Push-Up',
      equipment: 'bodyweight',
      cue: 'Straight line head to heels',
      example: '3 × max',
    },
  ],
  back: [
    {
      name: 'Deadlift',
      equipment: 'barbell',
      cue: 'Bar over midfoot, hinge at hips',
      example: '3 × 5',
    },
    {
      name: 'Lat Pulldown',
      equipment: 'cable',
      cue: 'Pull to upper chest, squeeze shoulder blades',
      example: '3 × 10–12',
    },
    {
      name: 'Pull-Up',
      equipment: 'bodyweight',
      cue: 'Chin over bar, full hang at bottom',
      example: '3 × max',
    },
  ],
  legs: [
    {
      name: 'Back Squat',
      equipment: 'barbell',
      cue: 'Hips below knees, knees track toes',
      example: '3 × 6–8',
    },
    {
      name: 'Leg Press',
      equipment: 'machine',
      cue: 'Feet shoulder-width, don’t lock knees',
      example: '3 × 10–12',
    },
    {
      name: 'Bodyweight Lunge',
      equipment: 'bodyweight',
      cue: 'Front knee over ankle, torso upright',
      example: '3 × 10 each',
    },
  ],
  shoulders: [
    {
      name: 'Overhead Press',
      equipment: 'barbell',
      cue: 'Bar path close to face, brace core',
      example: '3 × 6–8',
    },
    {
      name: 'Dumbbell Lateral Raise',
      equipment: 'dumbbell',
      cue: 'Raise to shoulder height, slight elbow bend',
      example: '3 × 12–15',
    },
    {
      name: 'Cable Face Pull',
      equipment: 'cable',
      cue: 'Pull to forehead, rotate shoulders back',
      example: '3 × 12–15',
    },
  ],
  arms: [
    {
      name: 'Barbell Curl',
      equipment: 'barbell',
      cue: 'Elbows pinned to sides',
      example: '3 × 8–12',
    },
    {
      name: 'Dumbbell Hammer Curl',
      equipment: 'dumbbell',
      cue: 'Neutral grip, controlled negative',
      example: '3 × 10–12',
    },
    {
      name: 'Cable Triceps Pushdown',
      equipment: 'cable',
      cue: 'Elbows fixed, full extension',
      example: '3 × 10–12',
    },
  ],
  core: [
    {
      name: 'Plank',
      equipment: 'bodyweight',
      cue: 'Ribs down, glutes squeezed',
      example: '3 × 30–60s',
    },
    {
      name: 'Cable Woodchop',
      equipment: 'cable',
      cue: 'Rotate from the hips, not just arms',
      example: '3 × 10 each',
    },
    {
      name: 'Hanging Leg Raise',
      equipment: 'bodyweight',
      cue: 'Curl pelvis up, avoid swinging',
      example: '3 × 10–15',
    },
  ],
};

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
};
