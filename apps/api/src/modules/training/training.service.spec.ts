import { describe, expect, it, vi } from 'vitest';
import type { TrainingRepository } from './training.repository.js';
import { TrainingService } from './training.service.js';

function createRepositoryMock(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    listSessions: vi.fn(),
    findSessionById: vi.fn(),
    createSession: vi.fn(),
    finishSession: vi.fn(),
    removeSession: vi.fn(),
    listSessionExercises: vi.fn(),
    findSessionExerciseById: vi.fn(),
    nextPosition: vi.fn(),
    findGroupByExercise: vi.fn(),
    createExerciseGroup: vi.fn(),
    nextSetPosition: vi.fn(),
    addSet: vi.fn(),
    updateSet: vi.fn(),
    removeSet: vi.fn(),
    hasRemainingSets: vi.fn(),
    updateExerciseNotes: vi.fn(),
    updateExerciseRest: vi.fn(),
    removeExercise: vi.fn(),
    lastPerformanceByExerciseIds: vi.fn(),
    ...overrides,
  } as unknown as TrainingRepository;
}

describe('TrainingService.finishSession', () => {
  it('passes the elapsed duration through to the repository', async () => {
    const repository = createRepositoryMock({
      finishSession: vi.fn().mockResolvedValue({ id: 'session-1', durationSeconds: 120 }),
    });
    const service = new TrainingService(repository);

    await service.finishSession('session-1', 'user-1', 120);

    expect(repository.finishSession).toHaveBeenCalledWith('session-1', 'user-1', 120);
  });
});

describe('TrainingService.updateExerciseRest', () => {
  it('returns undefined without updating when the session is not owned by the user', async () => {
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue(undefined),
    });
    const service = new TrainingService(repository);

    const result = await service.updateExerciseRest('session-1', 'log-1', 'user-1', 120);

    expect(result).toBeUndefined();
    expect(repository.updateExerciseRest).not.toHaveBeenCalled();
  });

  it('updates the row and returns the enriched exercise on success', async () => {
    const enriched = { id: 'log-1', sessionId: 'session-1', restSeconds: 120 };
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      updateExerciseRest: vi.fn().mockResolvedValue(true),
      findSessionExerciseById: vi.fn().mockResolvedValue(enriched),
    });
    const service = new TrainingService(repository);

    const result = await service.updateExerciseRest('session-1', 'log-1', 'user-1', 120);

    expect(repository.updateExerciseRest).toHaveBeenCalledWith('log-1', 'session-1', 120);
    expect(result).toBe(enriched);
  });
});

describe('TrainingService.addExercise', () => {
  it('creates a new group and appends the first set when none exists yet', async () => {
    const group = { id: 'group-1', sessionId: 'session-1' };
    const enriched = { id: 'group-1', sets: [{ id: 'set-1', reps: 5, weightKg: 50 }] };
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      findGroupByExercise: vi.fn().mockResolvedValue(undefined),
      nextPosition: vi.fn().mockResolvedValue(0),
      createExerciseGroup: vi.fn().mockResolvedValue(group),
      nextSetPosition: vi.fn().mockResolvedValue(0),
      addSet: vi.fn().mockResolvedValue({ id: 'set-1' }),
      findSessionExerciseById: vi.fn().mockResolvedValue(enriched),
    });
    const service = new TrainingService(repository);

    const result = await service.addExercise('session-1', 'user-1', {
      exerciseId: 'ex-1',
      reps: 5,
      weightKg: 50,
    });

    expect(repository.createExerciseGroup).toHaveBeenCalledWith({
      sessionId: 'session-1',
      exerciseId: 'ex-1',
      position: 0,
    });
    expect(repository.addSet).toHaveBeenCalledWith({
      sessionExerciseId: 'group-1',
      reps: 5,
      weightKg: 50,
      position: 0,
    });
    expect(result).toBe(enriched);
  });

  it('appends a set to the existing group instead of creating a duplicate', async () => {
    const group = { id: 'group-1', sessionId: 'session-1' };
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      findGroupByExercise: vi.fn().mockResolvedValue(group),
      nextSetPosition: vi.fn().mockResolvedValue(2),
      addSet: vi.fn().mockResolvedValue({ id: 'set-3' }),
      findSessionExerciseById: vi.fn().mockResolvedValue({ id: 'group-1', sets: [] }),
    });
    const service = new TrainingService(repository);

    await service.addExercise('session-1', 'user-1', { exerciseId: 'ex-1', reps: 4, weightKg: 60 });

    expect(repository.createExerciseGroup).not.toHaveBeenCalled();
    expect(repository.addSet).toHaveBeenCalledWith({
      sessionExerciseId: 'group-1',
      reps: 4,
      weightKg: 60,
      position: 2,
    });
  });
});

describe('TrainingService.removeSet', () => {
  it('removes the exercise group too when the removed set was the last one', async () => {
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      removeSet: vi.fn().mockResolvedValue(true),
      hasRemainingSets: vi.fn().mockResolvedValue(false),
      removeExercise: vi.fn().mockResolvedValue(true),
    });
    const service = new TrainingService(repository);

    const result = await service.removeSet('session-1', 'group-1', 'set-1', 'user-1');

    expect(result).toBe(true);
    expect(repository.removeExercise).toHaveBeenCalledWith('group-1', 'session-1');
  });

  it('leaves the group alone when other sets remain', async () => {
    const repository = createRepositoryMock({
      findSessionById: vi.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
      removeSet: vi.fn().mockResolvedValue(true),
      hasRemainingSets: vi.fn().mockResolvedValue(true),
    });
    const service = new TrainingService(repository);

    const result = await service.removeSet('session-1', 'group-1', 'set-1', 'user-1');

    expect(result).toBe(true);
    expect(repository.removeExercise).not.toHaveBeenCalled();
  });
});

describe('TrainingService.getLastPerformance', () => {
  it('returns an entry only for exercise ids that have history', async () => {
    const repository = createRepositoryMock({
      lastPerformanceByExerciseIds: vi
        .fn()
        .mockResolvedValue(
          new Map([['ex-2', { reps: 8, weightKg: 40, restSeconds: null, date: '2026-08-06' }]]),
        ),
    });
    const service = new TrainingService(repository);

    const result = await service.getLastPerformance('user-1', ['ex-1', 'ex-2']);

    expect(result).toEqual([
      { exerciseId: 'ex-2', reps: 8, weightKg: 40, restSeconds: null, date: '2026-08-06' },
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
