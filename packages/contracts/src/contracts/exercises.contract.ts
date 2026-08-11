import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { exerciseSchema, listExercisesQuerySchema } from '../schemas/exercise.schema.js';

const c = initContract();

export const exercisesContract = c.router({
  listExercises: {
    method: 'GET',
    path: '/exercises',
    query: listExercisesQuerySchema,
    responses: { 200: z.array(exerciseSchema) },
    summary: 'List/search the global exercise catalog',
  },
});
