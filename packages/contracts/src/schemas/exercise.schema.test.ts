import { describe, expect, it } from 'vitest';
import { exerciseIdParamsSchema, exerciseSchema } from './exercise.schema.js';

describe('exerciseSchema', () => {
  const base = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Barbell Bench Press',
    muscleGroups: ['chest'],
    equipment: 'barbell',
    description: 'Bar to mid-chest.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('accepts null detail fields', () => {
    const result = exerciseSchema.safeParse({
      ...base,
      instructions: null,
      commonMistakes: null,
      setupNotes: null,
      videoUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts populated detail fields', () => {
    const result = exerciseSchema.safeParse({
      ...base,
      instructions: 'Lower under control.',
      commonMistakes: 'Flaring elbows.',
      setupNotes: 'Shoulder blades retracted.',
      videoUrl: 'https://example.com/video',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing detail field', () => {
    const result = exerciseSchema.safeParse({
      ...base,
      instructions: null,
      commonMistakes: null,
      setupNotes: null,
      // videoUrl omitted
    });
    expect(result.success).toBe(false);
  });
});

describe('exerciseIdParamsSchema', () => {
  it('rejects a non-uuid id', () => {
    expect(exerciseIdParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('accepts a uuid id', () => {
    expect(
      exerciseIdParamsSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' }).success,
    ).toBe(true);
  });
});
