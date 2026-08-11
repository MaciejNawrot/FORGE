import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  createWorkoutExerciseInputSchema,
  createWorkoutPlanInputSchema,
  planIdParamsSchema,
  updateWorkoutExerciseInputSchema,
  updateWorkoutPlanInputSchema,
  workoutExerciseParamsSchema,
  workoutExerciseSchema,
  workoutPlanIdParamsSchema,
  workoutPlanListItemSchema,
  workoutPlanSchema,
  workoutPlanWithExercisesSchema,
} from '../schemas/workout.schema.js';

const c = initContract();

export const workoutsContract = c.router({
  listPlans: {
    method: 'GET',
    path: '/workout-plans',
    responses: { 200: z.array(workoutPlanListItemSchema), 401: errorResponseSchema },
    summary: "List the current user's workout plans",
  },
  listTemplates: {
    method: 'GET',
    path: '/workout-plans/templates',
    responses: { 200: z.array(workoutPlanWithExercisesSchema), 401: errorResponseSchema },
    summary: 'List the global, browsable plan templates',
  },
  forkPlan: {
    method: 'POST',
    path: '/workout-plans/:id/fork',
    pathParams: workoutPlanIdParamsSchema,
    body: c.noBody(),
    responses: { 201: workoutPlanSchema, 401: errorResponseSchema, 404: errorResponseSchema },
    summary: "Copy a template into the current user's own plans",
  },
  getPlan: {
    method: 'GET',
    path: '/workout-plans/:id',
    pathParams: workoutPlanIdParamsSchema,
    responses: {
      200: workoutPlanWithExercisesSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a workout plan with its exercises',
  },
  createPlan: {
    method: 'POST',
    path: '/workout-plans',
    body: createWorkoutPlanInputSchema,
    responses: { 201: workoutPlanSchema, 401: errorResponseSchema },
    summary: 'Create a workout plan',
  },
  updatePlan: {
    method: 'PATCH',
    path: '/workout-plans/:id',
    pathParams: workoutPlanIdParamsSchema,
    body: updateWorkoutPlanInputSchema,
    responses: { 200: workoutPlanSchema, 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Update a workout plan',
  },
  removePlan: {
    method: 'DELETE',
    path: '/workout-plans/:id',
    pathParams: workoutPlanIdParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Delete a workout plan',
  },
  addExercise: {
    method: 'POST',
    path: '/workout-plans/:planId/exercises',
    pathParams: planIdParamsSchema,
    body: createWorkoutExerciseInputSchema,
    responses: { 201: workoutExerciseSchema, 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Add an exercise to a workout plan',
  },
  updateExercise: {
    method: 'PATCH',
    path: '/workout-plans/:planId/exercises/:exerciseId',
    pathParams: workoutExerciseParamsSchema,
    body: updateWorkoutExerciseInputSchema,
    responses: { 200: workoutExerciseSchema, 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Update an exercise in a workout plan',
  },
  removeExercise: {
    method: 'DELETE',
    path: '/workout-plans/:planId/exercises/:exerciseId',
    pathParams: workoutExerciseParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 401: errorResponseSchema, 404: errorResponseSchema },
    summary: 'Remove an exercise from a workout plan',
  },
});
