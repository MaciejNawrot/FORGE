import { describe, expect, it } from 'vitest';
import { buildExerciseRows, prefillFrom } from './plan-progress';

describe('buildExerciseRows', () => {
  const benchPlan = { exercise: { id: 'bench' }, sets: 3, reps: 8, weightKg: 60 };
  const plan = { exercises: [benchPlan] };

  it('fills every target set as a placeholder when nothing is logged yet, prefilled from the plan target', () => {
    const rows = buildExerciseRows(plan, [], undefined);

    expect(rows).toEqual([
      {
        key: 'bench',
        exercise: { id: 'bench' },
        loggedExercise: null,
        placeholderCount: 3,
        placeholderPrefill: { reps: 8, weightKg: '60' },
      },
    ]);
  });

  it('prefers historical last performance over the plan target when nothing is logged this session', () => {
    const lastPerformance = [{ exerciseId: 'bench', reps: 10, weightKg: 65 }];

    const rows = buildExerciseRows(plan, [], lastPerformance);

    expect(rows[0]?.placeholderPrefill).toEqual({ reps: 10, weightKg: '65' });
  });

  it("shows only the remaining placeholders, prefilled from this session's own last logged set", () => {
    const loggedExercise = {
      exercise: { id: 'bench' },
      sets: [
        { reps: 8, weightKg: 60 },
        { reps: 8, weightKg: 62.5 },
      ],
    };

    const rows = buildExerciseRows(
      plan,
      [loggedExercise],
      [{ exerciseId: 'bench', reps: 1, weightKg: 1 }],
    );

    expect(rows).toEqual([
      {
        key: 'bench',
        exercise: { id: 'bench' },
        loggedExercise,
        placeholderCount: 1,
        placeholderPrefill: { reps: 8, weightKg: '62.5' },
      },
    ]);
  });

  it('has zero placeholders once the target set count is met', () => {
    const loggedExercise = {
      exercise: { id: 'bench' },
      sets: [
        { reps: 8, weightKg: 60 },
        { reps: 8, weightKg: 60 },
        { reps: 7, weightKg: 60 },
      ],
    };

    const rows = buildExerciseRows(plan, [loggedExercise], undefined);

    expect(rows[0]?.placeholderCount).toBe(0);
  });

  it('passes through a logged exercise not in the plan with zero placeholders', () => {
    const adHoc = { exercise: { id: 'curls' }, sets: [{ reps: 12, weightKg: 20 }] };

    const rows = buildExerciseRows(plan, [adHoc], undefined);

    expect(rows).toEqual([
      {
        key: 'bench',
        exercise: { id: 'bench' },
        loggedExercise: null,
        placeholderCount: 3,
        placeholderPrefill: { reps: 8, weightKg: '60' },
      },
      {
        key: 'curls',
        exercise: { id: 'curls' },
        loggedExercise: adHoc,
        placeholderCount: 0,
        placeholderPrefill: { reps: 0, weightKg: '' },
      },
    ]);
  });

  it('returns rows from session exercises only, all with zero placeholders, when there is no plan', () => {
    const adHoc = { exercise: { id: 'curls' }, sets: [{ reps: 12, weightKg: 20 }] };

    const rows = buildExerciseRows(null, [adHoc], undefined);

    expect(rows).toEqual([
      {
        key: 'curls',
        exercise: { id: 'curls' },
        loggedExercise: adHoc,
        placeholderCount: 0,
        placeholderPrefill: { reps: 0, weightKg: '' },
      },
    ]);
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
