/** Fixed, color-coded training types shown on the tracker heatmap. */
export const trainingTypes = ['strength', 'cardio', 'mobility', 'rest'] as const;
export type TrainingType = (typeof trainingTypes)[number];
