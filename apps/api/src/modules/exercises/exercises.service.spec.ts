import { describe, expect, it, vi } from 'vitest';
import type { ExercisesRepository } from './exercises.repository.js';
import { ExercisesService } from './exercises.service.js';

function createRepositoryMock(overrides: Partial<ExercisesRepository> = {}): ExercisesRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    ...overrides,
  } as unknown as ExercisesRepository;
}

describe('ExercisesService', () => {
  it('returns the exercise when found', async () => {
    const now = new Date();
    const exercise = {
      id: '1',
      name: 'Barbell Bench Press',
      muscleGroups: ['chest'],
      equipment: 'barbell',
      description: 'Bar to mid-chest.',
      instructions: null,
      commonMistakes: null,
      setupNotes: null,
      videoUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    const repository = createRepositoryMock({ findById: vi.fn().mockResolvedValue(exercise) });
    const service = new ExercisesService(repository);

    await expect(service.getExercise('1')).resolves.toEqual(exercise);
  });

  it('returns undefined when the exercise is not found', async () => {
    const repository = createRepositoryMock({ findById: vi.fn().mockResolvedValue(undefined) });
    const service = new ExercisesService(repository);

    await expect(service.getExercise('missing')).resolves.toBeUndefined();
  });
});
