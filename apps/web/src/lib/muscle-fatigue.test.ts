import { describe, expect, it } from 'vitest';
import { alreadyTrainedGroups } from './muscle-fatigue';

describe('alreadyTrainedGroups', () => {
  it('returns muscle groups shared with already-logged exercises', () => {
    const logged = [
      { exercise: { muscleGroups: ['chest', 'triceps'] } },
      { exercise: { muscleGroups: ['back'] } },
    ];

    expect(alreadyTrainedGroups(['back', 'biceps'], logged)).toEqual(['back']);
  });

  it('returns an empty array when nothing overlaps', () => {
    const logged = [{ exercise: { muscleGroups: ['legs'] } }];

    expect(alreadyTrainedGroups(['chest'], logged)).toEqual([]);
  });

  it('returns an empty array when no exercises have been logged yet', () => {
    expect(alreadyTrainedGroups(['chest'], [])).toEqual([]);
  });
});
