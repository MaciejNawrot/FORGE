import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  exerciseIdParamsSchema,
  exerciseSchema,
  listExercisesQuerySchema,
} from '../schemas/exercise.schema.js';

const c = initContract();

export const exercisesContract = c.router({
  listExercises: {
    method: 'GET',
    path: '/exercises',
    query: listExercisesQuerySchema,
    responses: { 200: z.array(exerciseSchema) },
    summary: 'List/search the global exercise catalog',
  },
  getExercise: {
    method: 'GET',
    path: '/exercises/:id',
    pathParams: exerciseIdParamsSchema,
    responses: {
      200: exerciseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a single exercise with full detail content',
  },
});
