import { describe, expect, it } from 'vitest';
import { unloggedPlanExercises } from './plan-progress';

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
