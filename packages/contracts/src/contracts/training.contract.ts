import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  addTrainingSessionExerciseInputSchema,
  createTrainingSessionInputSchema,
  listTrainingSessionsQuerySchema,
  sessionIdParamsSchema,
  trainingSessionExerciseParamsSchema,
  trainingSessionExerciseSchema,
  trainingSessionIdParamsSchema,
  trainingSessionSchema,
  trainingSessionWithExercisesSchema,
} from '../schemas/training.schema.js';

const c = initContract();

export const trainingContract = c.router({
  listSessions: {
    method: 'GET',
    path: '/training-sessions',
    query: listTrainingSessionsQuerySchema,
    responses: { 200: z.array(trainingSessionSchema), 401: errorResponseSchema },
    summary: "List the current user's training sessions in a date range",
  },
  getSession: {
    method: 'GET',
    path: '/training-sessions/:id',
    pathParams: trainingSessionIdParamsSchema,
    responses: {
      200: trainingSessionWithExercisesSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a training session with its exercises',
  },
  createSession: {
    method: 'POST',
    path: '/training-sessions',
    body: createTrainingSessionInputSchema,
    responses: { 201: trainingSessionSchema, 401: errorResponseSchema },
    summary: 'Log a new training session',
  },
  removeSession: {
    method: 'DELETE',
    path: '/training-sessions/:id',
    pathParams: trainingSessionIdParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Delete a training session',
  },
  addSessionExercise: {
    method: 'POST',
    path: '/training-sessions/:sessionId/exercises',
    pathParams: sessionIdParamsSchema,
    body: addTrainingSessionExerciseInputSchema,
    responses: {
      201: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Add an exercise to a training session',
  },
  removeSessionExercise: {
    method: 'DELETE',
    path: '/training-sessions/:sessionId/exercises/:exerciseId',
    pathParams: trainingSessionExerciseParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Remove an exercise from a training session',
  },
});
