import type { Dictionary } from './en';

/** Polish has three plural forms (1 / 2-4 / 5+, with a 12-14 exception). */
function plCount(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

export const pl: Dictionary = {
  common: {
    logIn: 'Zaloguj się',
    logOut: 'Wyloguj się',
    cancel: 'Anuluj',
    delete: 'Usuń',
    deleting: 'Usuwanie…',
    save: 'Zapisz',
    saving: 'Zapisywanie…',
    edit: 'Edytuj',
    remove: 'Usuń',
    add: 'Dodaj',
    adding: 'Dodawanie…',
    change: 'Zmień',
    loading: 'Ładowanie…',
    logging: 'Zapisywanie…',
    finish: 'Zakończ',
    name: 'Nazwa',
    personName: 'Imię i nazwisko',
    email: 'E-mail',
    password: 'Hasło',
    date: 'Data',
    type: 'Typ',
    sets: 'Serie',
    reps: 'Powtórzenia',
    weightKg: 'Ciężar (kg)',
    searchExercises: 'Szukaj ćwiczeń…',
    noExercisesMatch: (search: string) => `Brak ćwiczeń pasujących do „${search}”.`,
    exerciseCount: (n: number) => `${n} ${plCount(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}`,
    setCount: (n: number) => `${n} ${plCount(n, 'seria', 'serie', 'serii')}`,
  },

  trainingType: {
    strength: 'Siła',
    cardio: 'Cardio',
    mobility: 'Mobilność',
    rest: 'Odpoczynek',
  },

  nav: {
    home: 'Start',
    workouts: 'Plany',
    tracking: 'Śledzenie',
    progress: 'Postępy',
    exercises: 'Ćwiczenia',
    users: 'Użytkownicy',
    settings: 'Ustawienia',
  },

  home: {
    weekdays: ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'],
    tagline: 'Twój panel treningowy — zapisuj treningi, korzystaj z planów i śledź postępy.',
    loginRegister: 'Zaloguj się / Zarejestruj',
    browseTemplates: 'Przeglądaj szablony treningów',
    dayStreak: 'Dni serii',
    thisWeek: 'W tym tygodniu',
    strengthFocus: 'Trening siłowy',
    readyForWorkout: 'Gotowy na trening?',
    startAPlan: 'Rozpocznij plan',
    todaysOutput: 'Dzisiejsze wyniki',
    kcal: 'Kcal',
    steps: 'Kroki',
    activeTime: 'Czas aktywności',
    workoutsLabel: 'treningi',
    last90Days: 'Ostatnie 90 dni',
    trainingsLoggedLabel: 'zapisanych treningów',
    recentActivity: 'Ostatnia aktywność',
    viewAll: 'Zobacz wszystko',
    noTrainings: 'Brak zapisanych treningów — rozpocznij jeden w zakładce Śledzenie.',
  },

  plans: {
    loginRequired: 'Zaloguj się, aby zobaczyć swoje plany treningowe.',
    title: 'Plany treningowe',
    browseTemplates: 'Przeglądaj szablony',
    empty: 'Brak planów — dodaj jeden powyżej.',
  },

  planDetail: {
    loginRequired: 'Zaloguj się, aby zobaczyć ten plan treningowy.',
    deletePlan: 'Usuń plan',
    deletePlanTitle: 'Usunąć ten plan?',
    deletePlanDescription: (name: string) =>
      `„${name}” i wszystkie jego ćwiczenia zostaną trwale usunięte.`,
    notes: 'Notatki',
    exercisesHeading: 'Ćwiczenia',
    noExercises: 'Brak ćwiczeń — dodaj jedno poniżej.',
    addExercise: 'Dodaj ćwiczenie',
    removeExerciseTitle: 'Usunąć to ćwiczenie?',
    removeExerciseDescription: (name: string) => `„${name}” zostanie usunięte z tego planu.`,
  },

  templates: {
    loginRequired: 'Zaloguj się, aby przeglądać szablony planów.',
    title: 'Biblioteka treningów',
    description:
      'Przeglądaj gotowe rutyny i dodawaj własne kopie do swoich planów — edycje nie wpływają na oryginał.',
    allWorkouts: 'Wszystkie treningi',
    searchPlaceholder: 'Szukaj treningów…',
    noMatch: (search: string) => `Brak szablonów pasujących do „${search}”.`,
  },

  forkTemplate: {
    cta: 'Dodaj do moich planów',
  },

  templateDetail: {
    startWorkout: 'Rozpocznij trening',
    starting: 'Rozpoczynanie…',
    theRoutine: 'Plan treningu',
    exercisesCount: (n: number) => `${n} ${plCount(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}`,
    empty: 'Ten szablon nie ma jeszcze ćwiczeń.',
    setsReps: (sets: number, reps: number, weightKg?: number | null) =>
      `${sets} serie × ${reps} powtórzeń${weightKg ? ` · ${weightKg} kg` : ''}`,
  },

  progress: {
    loginRequired: 'Zaloguj się, aby zobaczyć swoje postępy.',
    title: 'Analiza',
    subtitle: 'Śledź swoje postępy i intensywność w czasie.',
    volumeProgression: 'Progresja objętości',
    totalWorkouts: 'Łącznie treningów',
    avgRestTime: 'Śr. czas odpoczynku',
    personalBests: 'Rekordy osobiste',
    noBests: 'Zapisz ćwiczenie z obciążeniem, aby zobaczyć tu swoje rekordy.',
    bestLine: (reps: number, date: string) =>
      `${reps} ${plCount(reps, 'powtórzenie', 'powtórzenia', 'powtórzeń')} · ${date}`,
    consistency: 'Regularność',
    last12Months: 'Ostatnie 12 miesięcy',
  },

  settings: {
    title: 'Ustawienia',
    theme: 'Motyw',
    language: 'Język',
    savedToDevice: 'Zapisane na tym urządzeniu.',
  },

  tracker: {
    loginRequired: 'Zaloguj się, aby rozpocząć trening.',
    startHeading: 'Rozpocznij trening',
    fromPlanHeading: 'Z twoich planów',
    noPlans: 'Brak planów — przeglądaj szablony lub stwórz własny w Planach.',
    start: 'Rozpocznij',
    starting: 'Rozpoczynanie…',
    history: 'Historia',
    recentTrainings: 'Ostatnie treningi',
    noTrainings: 'Brak zapisanych treningów — rozpocznij jeden powyżej.',
  },

  activeTracking: {
    duration: 'Czas trwania treningu',
    logSet: 'Zapisz serię',
    previousSets: 'Poprzednie serie',
    resting: 'Odpoczynek…',
    lastTime: (weightKg: number | null, reps: number, sets: number, date: string) =>
      `Poprzednio: ${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. × ${sets} serie (${date})`,
    alreadyTrained: (muscleGroups: string) => `Już trenowane dziś: ${muscleGroups}`,
  },

  sessionDetail: {
    loginRequired: 'Zaloguj się, aby zobaczyć ten trening.',
    deleteTitle: 'Usunąć ten trening?',
    deleteDescription: 'Ten trening i wszystkie zapisane w nim ćwiczenia zostaną trwale usunięte.',
    deleteWorkoutSr: 'Usuń trening',
    noSets: 'Brak zapisanych serii — zapisz pierwszą powyżej.',
    finishTitle: 'Zakończyć ten trening?',
    finishDescription:
      'Możesz wrócić do zapisywania serii później — to tylko przenosi Cię z powrotem do Śledzenia.',
    exerciseLine: (weightKg: number | null, reps: number, sets: number) =>
      `${weightKg != null ? `${weightKg} kg × ` : ''}${reps} powt. × ${sets} serie`,
    removeExerciseDescription: (name: string) => `„${name}” zostanie usunięte z tego treningu.`,
  },

  mascot: {
    newbie: { name: 'Nowicjusz', tip: 'Zaczynamy — zapisz swój pierwszy trening!' },
    gettingThere: { name: 'W drodze', tip: 'Świetnie, budujesz serię treningów.' },
    consistent: { name: 'Regularny', tip: 'Solidna regularność — tak trzymaj!' },
    absoluteUnit: { name: 'Prawdziwa Maszyna', tip: 'Jesteś prawdziwą maszyną. Szacunek.' },
    trainingsLogged: (n: number) =>
      `${n} ${plCount(n, 'zapisany trening', 'zapisane treningi', 'zapisanych treningów')}`,
  },

  streakBanner: {
    title: 'Utrzymaj płomień!',
    body: (nextDay: number) => `Zapisz dzisiaj trening, aby osiągnąć ${nextDay}. dzień.`,
  },

  addTrainingForm: {
    submit: 'Zapisz trening',
  },

  createPlanForm: {
    namePlaceholder: 'Dzień push',
    submit: 'Dodaj plan',
  },

  createUserForm: {
    submit: 'Dodaj użytkownika',
  },

  exercises: {
    title: 'Biblioteka ćwiczeń',
  },

  login: {
    register: 'Zarejestruj się',
    loggingIn: 'Logowanie…',
    creatingAccount: 'Tworzenie konta…',
  },

  users: {
    title: 'Użytkownicy',
    empty: 'Brak użytkowników.',
  },

  notFound: {
    title: 'Nie znaleziono',
    body: 'Ta strona nie istnieje lub element został usunięty.',
    backHome: 'Wróć na start',
  },

  errorPage: {
    title: 'Coś poszło nie tak',
    fallbackMessage: 'Wystąpił nieoczekiwany błąd.',
    tryAgain: 'Spróbuj ponownie',
  },
};
