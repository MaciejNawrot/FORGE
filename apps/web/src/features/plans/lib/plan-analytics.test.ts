import { describe, expect, it } from 'vitest';
import { computePlanStats } from './plan-analytics';

describe('computePlanStats', () => {
  it('sums volume and duration, and tracks the heaviest set per exercise', () => {
    const sessions = [
      {
        date: '2026-08-01',
        durationSeconds: 3000,
        exercises: [
          {
            exercise: { name: 'Bench Press' },
            sets: [
              { reps: 5, weightKg: 100 },
              { reps: 5, weightKg: 100 },
            ],
          },
        ],
      },
      {
        date: '2026-08-08',
        durationSeconds: 3600,
        exercises: [
          {
            exercise: { name: 'Bench Press' },
            sets: [{ reps: 3, weightKg: 110 }],
          },
        ],
      },
    ];

    const stats = computePlanStats(sessions);

    expect(stats.totalVolumeKg).toBe(5 * 100 + 5 * 100 + 3 * 110);
    expect(stats.sessionCount).toBe(2);
    expect(stats.avgDurationSeconds).toBe(3300);
    expect(stats.bestByExercise.get('Bench Press')).toEqual({
      weight: 110,
      reps: 3,
      date: '2026-08-08',
    });
    expect(stats.volumeBySession).toEqual([
      { date: '2026-08-01', volume: 1000 },
      { date: '2026-08-08', volume: 330 },
    ]);
  });

  it('returns zeroed stats for an empty session list', () => {
    const stats = computePlanStats([]);

    expect(stats.totalVolumeKg).toBe(0);
    expect(stats.sessionCount).toBe(0);
    expect(stats.avgDurationSeconds).toBe(0);
    expect(stats.bestByExercise.size).toBe(0);
    expect(stats.volumeBySession).toEqual([]);
  });

  it('averages duration only over sessions that have a duration, ignoring untimed sessions', () => {
    const sessions = [
      { date: '2026-08-01', durationSeconds: 3600, exercises: [] },
      { date: '2026-08-08', durationSeconds: 3600, exercises: [] },
      { date: '2026-08-15', durationSeconds: 3600, exercises: [] },
      { date: '2026-08-16', durationSeconds: null, exercises: [] },
    ];

    const stats = computePlanStats(sessions);

    expect(stats.sessionCount).toBe(4);
    expect(stats.avgDurationSeconds).toBe(3600);
  });

  it('ignores unweighted (bodyweight) sets when tracking personal bests', () => {
    const sessions = [
      {
        date: '2026-08-01',
        durationSeconds: 600,
        exercises: [
          {
            exercise: { name: 'Pull-ups' },
            sets: [{ reps: 10, weightKg: null }],
          },
        ],
      },
    ];

    const stats = computePlanStats(sessions);

    expect(stats.bestByExercise.size).toBe(0);
    expect(stats.totalVolumeKg).toBe(0);
  });
});
