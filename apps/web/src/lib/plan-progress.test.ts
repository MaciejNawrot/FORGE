import { describe, expect, it } from 'vitest';
import { prefillFrom, unloggedPlanExercises } from './plan-progress';

describe('unloggedPlanExercises', () => {
  it('keeps plan exercises with no matching logged entry', () => {
    const plan = [{ exercise: { id: 'a' } }, { exercise: { id: 'b' } }];
    const logged = [{ exercise: { id: 'a' } }];

    expect(unloggedPlanExercises(plan, logged)).toEqual([{ exercise: { id: 'b' } }]);
  });

  it('filters out plan exercises already logged, matched by catalog id', () => {
    const plan = [{ exercise: { id: 'a' } }];
    const logged = [{ exercise: { id: 'a' } }];

    expect(unloggedPlanExercises(plan, logged)).toEqual([]);
  });

  it('returns the full plan exercise list unchanged when nothing is logged yet', () => {
    const plan = [{ exercise: { id: 'a' } }, { exercise: { id: 'b' } }];

    expect(unloggedPlanExercises(plan, [])).toEqual(plan);
  });
});

describe('prefillFrom', () => {
  it('uses the plan target when there is no last-performance entry', () => {
    const planExercise = { reps: 8, weightKg: 60 };

    expect(prefillFrom(planExercise)).toEqual({ reps: 8, weightKg: '60' });
  });

  it('uses last performance when present, including a non-null weight', () => {
    const planExercise = { reps: 8, weightKg: 60 };
    const last = { reps: 10, weightKg: 45 };

    expect(prefillFrom(planExercise, last)).toEqual({ reps: 10, weightKg: '45' });
  });

  it('treats a real last-performance entry with a null (bodyweight) weight as empty, not the plan target', () => {
    const planExercise = { reps: 8, weightKg: 60 };
    const last = { reps: 12, weightKg: null };

    expect(prefillFrom(planExercise, last)).toEqual({ reps: 12, weightKg: '' });
  });
});
