import { describe, expect, it, vi } from 'vitest';
import type { TrainingRepository } from './training.repository.js';
import { TrainingService } from './training.service.js';

function createRepositoryMock(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    listSessions: vi.fn(),
    findSessionById: vi.fn(),
    createSession: vi.fn(),
    removeSession: vi.fn(),
    listSessionExercises: vi.fn(),
    findSessionExerciseById: vi.fn(),
    nextPosition: vi.fn(),
    addExercise: vi.fn(),
    removeExercise: vi.fn(),
    lastPerformanceByExerciseIds: vi.fn(),
    ...overrides,
  } as unknown as TrainingRepository;
}

describe('TrainingService.getLastPerformance', () => {
  it('returns an entry only for exercise ids that have history', async () => {
    const repository = createRepositoryMock({
      lastPerformanceByExerciseIds: vi
        .fn()
        .mockResolvedValue(
          new Map([['ex-2', { sets: 3, reps: 8, weightKg: 40, date: '2026-08-06' }]]),
        ),
    });
    const service = new TrainingService(repository);

    const result = await service.getLastPerformance('user-1', ['ex-1', 'ex-2']);

    expect(result).toEqual([
      { exerciseId: 'ex-2', sets: 3, reps: 8, weightKg: 40, date: '2026-08-06' },
    ]);
  });

  it('returns an empty array without querying when no exercise ids are given', async () => {
    const repository = createRepositoryMock();
    const service = new TrainingService(repository);

    const result = await service.getLastPerformance('user-1', []);

    expect(result).toEqual([]);
    expect(repository.lastPerformanceByExerciseIds).not.toHaveBeenCalled();
  });
});
