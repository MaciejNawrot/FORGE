import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  addTrainingSessionExerciseInputSchema,
  createTrainingSessionInputSchema,
  finishTrainingSessionInputSchema,
  lastPerformanceEntrySchema,
  lastPerformanceQuerySchema,
  listTrainingSessionsQuerySchema,
  sessionIdParamsSchema,
  trainingSessionExerciseParamsSchema,
  trainingSessionExerciseSchema,
  trainingSessionIdParamsSchema,
  trainingSessionSchema,
  trainingSessionSetParamsSchema,
  trainingSessionWithExercisesSchema,
  updateSessionExerciseNotesInputSchema,
  updateSessionExerciseRestInputSchema,
  updateTrainingSessionSetInputSchema,
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
  lastPerformance: {
    method: 'GET',
    path: '/training-sessions/exercises/last-performance',
    query: lastPerformanceQuerySchema,
    responses: { 200: z.array(lastPerformanceEntrySchema), 401: errorResponseSchema },
    summary: "Get the current user's most recently logged set per exercise",
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
    summary: 'Get a training session with its exercises and their sets',
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
  finishSession: {
    method: 'PATCH',
    path: '/training-sessions/:id/finish',
    pathParams: trainingSessionIdParamsSchema,
    body: finishTrainingSessionInputSchema,
    responses: {
      200: trainingSessionSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Mark a training session finished and record how long it took',
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
    summary:
      'Log a set for an exercise in a training session (creates the exercise entry on first use)',
  },
  updateSessionSet: {
    method: 'PATCH',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/sets/:setId',
    pathParams: trainingSessionSetParamsSchema,
    body: updateTrainingSessionSetInputSchema,
    responses: {
      200: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update a single logged set',
  },
  removeSessionSet: {
    method: 'DELETE',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/sets/:setId',
    pathParams: trainingSessionSetParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Remove a single logged set (removes the exercise entry too if it was the last set)',
  },
  updateSessionExerciseNotes: {
    method: 'PATCH',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/notes',
    pathParams: trainingSessionExerciseParamsSchema,
    body: updateSessionExerciseNotesInputSchema,
    responses: {
      200: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update the note attached to a logged exercise',
  },
  updateSessionExerciseRest: {
    method: 'PATCH',
    path: '/training-sessions/:sessionId/exercises/:exerciseId/rest',
    pathParams: trainingSessionExerciseParamsSchema,
    body: updateSessionExerciseRestInputSchema,
    responses: {
      200: trainingSessionExerciseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update the rest time recorded for a logged exercise',
  },
  removeSessionExercise: {
    method: 'DELETE',
    path: '/training-sessions/:sessionId/exercises/:exerciseId',
    pathParams: trainingSessionExerciseParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Remove an exercise (and all its sets) from a training session',
  },
});
