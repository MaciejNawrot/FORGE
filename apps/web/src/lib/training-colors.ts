import type { TrainingTypeValue } from '@acme/contracts';

/** Reuses existing semantic design tokens — no new palette needed. Labels live in the i18n dictionary. */
export const trainingTypeStyles: Record<TrainingTypeValue, { dot: string; badge: string }> = {
  strength: { dot: 'bg-primary', badge: 'bg-primary/15 text-primary' },
  cardio: { dot: 'bg-destructive', badge: 'bg-destructive/15 text-destructive' },
  mobility: { dot: 'bg-success', badge: 'bg-success/15 text-success' },
  rest: { dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export const trainingTypes: TrainingTypeValue[] = ['strength', 'cardio', 'mobility', 'rest'];

/**
 * Calendar date in the viewer's local timezone. `Date#toISOString` converts
 * to UTC first, which silently shifts "today" by a day for anyone east of
 * UTC in the evening (or west of it in the morning) — this doesn't.
 */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
