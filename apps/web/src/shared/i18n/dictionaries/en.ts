import type { TrainingTypeValue } from '@acme/contracts';

export const en = {
  common: {
    logIn: 'Log in',
    logOut: 'Log out',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting…',
    save: 'Save',
    saving: 'Saving…',
    edit: 'Edit',
    remove: 'Remove',
    add: 'Add',
    adding: 'Adding…',
    change: 'Change',
    loading: 'Loading…',
    logging: 'Logging…',
    finish: 'Finish',
    name: 'Name',
    personName: 'Name',
    email: 'Email',
    password: 'Password',
    date: 'Date',
    type: 'Type',
    sets: 'Sets',
    reps: 'Reps',
    weightKg: 'Weight (kg)',
    searchExercises: 'Search exercises…',
    noExercisesMatch: (search: string) => `No exercises match "${search}".`,
    exerciseCount: (n: number) => `${n} ${n === 1 ? 'exercise' : 'exercises'}`,
    setCount: (n: number) => `${n} ${n === 1 ? 'set' : 'sets'}`,
  },

  trainingType: {
    strength: 'Strength',
    cardio: 'Cardio',
    mobility: 'Mobility',
    rest: 'Rest',
  } satisfies Record<TrainingTypeValue, string>,

  nav: {
    home: 'Home',
    workouts: 'Workouts',
    tracking: 'Tracking',
    progress: 'Progress',
    exercises: 'Exercises',
    users: 'Users',
    components: 'Components',
    settings: 'Settings',
  },

  home: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as string[],
    tagline: 'Your training dashboard — log workouts, follow plans, and track progress.',
    loginRegister: 'Log in / Register',
    browseTemplates: 'Browse workout templates',
    dayStreak: 'Day Streak',
    thisWeek: 'This week',
    strengthFocus: 'Strength focus',
    readyForWorkout: 'Ready for your workout?',
    startAPlan: 'Start a plan',
    todaysOutput: "Today's Output",
    kcal: 'Kcal',
    steps: 'Steps',
    activeTime: 'Active Time',
    workoutsLabel: 'workouts',
    last90Days: 'Last 90 days',
    trainingsLoggedLabel: 'trainings logged',
    recentActivity: 'Recent activity',
    viewAll: 'View all',
    noTrainings: 'No trainings logged yet — start one from Tracking.',
  },

  plans: {
    loginRequired: 'Log in to see your workout plans.',
    title: 'Workout Plans',
    browseTemplates: 'Browse templates',
    empty: 'No plans yet — add one above.',
  },

  planDetail: {
    loginRequired: 'Log in to see this workout plan.',
    deletePlan: 'Delete plan',
    deletePlanTitle: 'Delete this plan?',
    deletePlanDescription: (name: string) =>
      `"${name}" and all of its exercises will be permanently deleted.`,
    notes: 'Notes',
    exercisesHeading: 'Exercises',
    noExercises: 'No exercises yet — add one below.',
    addExercise: 'Add exercise',
    pair: 'Pair with another exercise',
    unpair: 'Unpair',
    pairPickerTitle: 'Pair with…',
    noPairableExercises: 'No other exercises to pair with — add one first.',
    pairedWith: (name: string) => `Paired with ${name}`,
    removeExerciseTitle: 'Remove this exercise?',
    removeExerciseDescription: (name: string) => `"${name}" will be removed from this plan.`,
  },

  planAnalytics: {
    heading: 'Plan Analytics',
    noSessions: 'Log a session from this plan to see analytics here.',
    totalVolume: 'Total Volume',
    sessions: 'Sessions',
    avgDuration: 'Avg Duration',
  },

  templates: {
    loginRequired: 'Log in to browse plan templates.',
    title: 'Workout Library',
    description:
      'Browse ready-made routines and add your own copy to your plans — edits never touch the original.',
    allWorkouts: 'All workouts',
    searchPlaceholder: 'Search workouts…',
    noMatch: (search: string) => `No templates match "${search}".`,
  },

  forkTemplate: {
    cta: 'Add to my plans',
  },

  templateDetail: {
    startWorkout: 'Start Workout',
    starting: 'Starting…',
    theRoutine: 'The Routine',
    exercisesCount: (n: number) => `${n} Exercises`,
    empty: 'This template has no exercises yet.',
    setsReps: (sets: number, reps: number, weightKg?: number | null) =>
      `${sets} Sets × ${reps} Reps${weightKg ? ` · ${weightKg} kg` : ''}`,
  },

  progress: {
    loginRequired: 'Log in to see your progress.',
    title: 'Analytics',
    subtitle: 'Track your progression and intensity over time.',
    volumeProgression: 'Volume Progression',
    totalWorkouts: 'Total Workouts',
    avgRestTime: 'Avg Rest Time',
    personalBests: 'Personal Bests',
    noBests: 'Log a weighted exercise to see your bests here.',
    bestLine: (reps: number, date: string) => `${reps} rep${reps === 1 ? '' : 's'} · ${date}`,
    consistency: 'Consistency',
    last12Months: 'Last 12 months',
  },

  settings: {
    title: 'Settings',
    theme: 'Theme',
    language: 'Language',
    savedToDevice: 'Saved to this device.',
  },

  tracker: {
    loginRequired: 'Log in to start tracking a workout.',
    startHeading: 'Start a Workout',
    fromPlanHeading: 'From your plans',
    noPlans: 'No plans yet — browse templates or build one in Workouts.',
    start: 'Start',
    starting: 'Starting…',
    history: 'History',
    recentTrainings: 'Recent Trainings',
    noTrainings: 'No trainings logged yet — start one above.',
    activeSessionMessage: 'Training in progress',
    continue: 'Continue',
  },

  activeTracking: {
    duration: 'Active Workout Duration',
    start: 'Start',
    alreadyActive: 'You already have an active training in progress.',
    goToActive: 'Go to it',
    logSet: 'Log Set',
    loggedExercises: 'Exercises',
    resting: 'Resting…',
    lastTime: (weightKg: number | null, reps: number, date: string) =>
      `Last time: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} reps (${date})`,
    alreadyTrained: (muscleGroups: string) => `Already trained today: ${muscleGroups}`,
    pairedRest: 'Shared rest — logging a set on either exercise starts it',
  },

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
    removeExerciseDescription: (name: string) => `"${name}" will be removed from this training.`,
    pair: 'Pair with another exercise',
    unpair: 'Unpair',
    pairPickerTitle: 'Pair with…',
    noPairableExercises: 'No other exercises to pair with yet.',
  },

  mascot: {
    newbie: { name: 'Newbie', tip: "Let's get moving — log your first training!" },
    gettingThere: { name: 'Getting There', tip: "Nice, you're building a streak." },
    consistent: { name: 'Consistent', tip: 'Solid consistency — keep it up!' },
    absoluteUnit: { name: 'Absolute Unit', tip: "You're an absolute unit. Respect." },
    trainingsLogged: (n: number) => `${n} trainings logged`,
  },

  streakBanner: {
    title: 'Keep the flame alive!',
    body: (nextDay: number) => `Log a workout today to hit day ${nextDay}.`,
  },

  addTrainingForm: {
    submit: 'Log training',
  },

  createPlanForm: {
    namePlaceholder: 'Push Day',
    submit: 'Add plan',
  },

  createUserForm: {
    submit: 'Add user',
  },

  exercises: {
    title: 'Exercise Library',
    viewDetails: 'View exercise details',
    howToPerform: 'How to perform it',
    commonMistakes: 'Common mistakes',
    setupPosition: 'Setup & position',
    watchDemo: 'Watch a demo',
  },

  login: {
    register: 'Register',
    loggingIn: 'Logging in…',
    creatingAccount: 'Creating account…',
  },

  users: {
    title: 'Users',
    empty: 'No users yet.',
  },

  notFound: {
    title: 'Not found',
    body: 'This page doesn’t exist, or the item was deleted.',
    backHome: 'Back home',
  },

  errorPage: {
    title: 'Something went wrong',
    fallbackMessage: 'An unexpected error occurred.',
    tryAgain: 'Try again',
  },
};

export type Dictionary = typeof en;
