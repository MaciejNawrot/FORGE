import { describe, expect, it, vi } from 'vitest';
import { PairConflictError } from '../../common/errors/pair-conflict.error.js';
import type { WorkoutsRepository } from './workouts.repository.js';
import { WorkoutsService } from './workouts.service.js';

function createRepositoryMock(overrides: Partial<WorkoutsRepository> = {}): WorkoutsRepository {
  return {
    listPlans: vi.fn(),
    listTemplates: vi.fn(),
    findTemplateById: vi.fn(),
    forkPlan: vi.fn(),
    findPlanById: vi.fn(),
    listExercises: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    removePlan: vi.fn(),
    nextPosition: vi.fn(),
    addExercise: vi.fn(),
    findExerciseById: vi.fn(),
    updateExercise: vi.fn(),
    removeExercise: vi.fn(),
    pairExercises: vi.fn(),
    unpairExercise: vi.fn(),
    ...overrides,
  } as unknown as WorkoutsRepository;
}

describe('WorkoutsService.pairExercise', () => {
  it('returns not-found when the plan is not owned by the user', async () => {
    const repository = createRepositoryMock({ findPlanById: vi.fn().mockResolvedValue(undefined) });
    const service = new WorkoutsService(repository);

    const result = await service.pairExercise('plan-1', 'ex-1', 'user-1', 'ex-2');

    expect(result).toEqual({ outcome: 'not-found' });
    expect(repository.pairExercises).not.toHaveBeenCalled();
  });

  it('returns conflict when pairing an exercise with itself', async () => {
    const repository = createRepositoryMock({
      findPlanById: vi.fn().mockResolvedValue({ id: 'plan-1' }),
    });
    const service = new WorkoutsService(repository);

    const result = await service.pairExercise('plan-1', 'ex-1', 'user-1', 'ex-1');

    expect(result).toEqual({
      outcome: 'conflict',
      message: 'Cannot pair an exercise with itself',
    });
    expect(repository.pairExercises).not.toHaveBeenCalled();
  });

  it('returns not-found when either exercise is not in this plan', async () => {
    const repository = createRepositoryMock({
      findPlanById: vi.fn().mockResolvedValue({ id: 'plan-1' }),
      pairExercises: vi.fn().mockResolvedValue(undefined),
    });
    const service = new WorkoutsService(repository);

    const result = await service.pairExercise('plan-1', 'ex-1', 'user-1', 'ex-2');

    expect(result).toEqual({ outcome: 'not-found' });
  });

  it('returns conflict when the repository rejects an already-paired exercise', async () => {
    const repository = createRepositoryMock({
      findPlanById: vi.fn().mockResolvedValue({ id: 'plan-1' }),
      pairExercises: vi.fn().mockRejectedValue(new PairConflictError('already paired')),
    });
    const service = new WorkoutsService(repository);

    const result = await service.pairExercise('plan-1', 'ex-1', 'user-1', 'ex-2');

    expect(result).toEqual({ outcome: 'conflict', message: 'already paired' });
  });

  it('returns the enriched exercise on success', async () => {
    const paired = { id: 'ex-1', pairGroupId: 'group-1' };
    const enriched = { id: 'ex-1', exercise: { name: 'Bench' }, pairGroupId: 'group-1' };
    const repository = createRepositoryMock({
      findPlanById: vi.fn().mockResolvedValue({ id: 'plan-1' }),
      pairExercises: vi.fn().mockResolvedValue(paired),
      findExerciseById: vi.fn().mockResolvedValue(enriched),
    });
    const service = new WorkoutsService(repository);

    const result = await service.pairExercise('plan-1', 'ex-1', 'user-1', 'ex-2');

    expect(repository.pairExercises).toHaveBeenCalledWith('plan-1', 'ex-1', 'ex-2');
    expect(result).toEqual({ outcome: 'ok', exercise: enriched });
  });
});

describe('WorkoutsService.unpairExercise', () => {
  it('returns not-found when the plan is not owned by the user', async () => {
    const repository = createRepositoryMock({ findPlanById: vi.fn().mockResolvedValue(undefined) });
    const service = new WorkoutsService(repository);

    const result = await service.unpairExercise('plan-1', 'ex-1', 'user-1');

    expect(result).toEqual({ outcome: 'not-found' });
  });

  it('returns conflict when the repository rejects an exercise that is not paired', async () => {
    const repository = createRepositoryMock({
      findPlanById: vi.fn().mockResolvedValue({ id: 'plan-1' }),
      unpairExercise: vi.fn().mockRejectedValue(new PairConflictError('not paired')),
    });
    const service = new WorkoutsService(repository);

    const result = await service.unpairExercise('plan-1', 'ex-1', 'user-1');

    expect(result).toEqual({ outcome: 'conflict', message: 'not paired' });
  });

  it('returns the enriched exercise on success', async () => {
    const unpaired = { id: 'ex-1', pairGroupId: null };
    const enriched = { id: 'ex-1', exercise: { name: 'Bench' }, pairGroupId: null };
    const repository = createRepositoryMock({
      findPlanById: vi.fn().mockResolvedValue({ id: 'plan-1' }),
      unpairExercise: vi.fn().mockResolvedValue(unpaired),
      findExerciseById: vi.fn().mockResolvedValue(enriched),
    });
    const service = new WorkoutsService(repository);

    const result = await service.unpairExercise('plan-1', 'ex-1', 'user-1');

    expect(result).toEqual({ outcome: 'ok', exercise: enriched });
  });
});
