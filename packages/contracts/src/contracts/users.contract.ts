import { initContract } from '@ts-rest/core';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  createUserInputSchema,
  listUsersQuerySchema,
  paginatedUsersSchema,
  updateUserInputSchema,
  userIdParamsSchema,
  userSchema,
} from '../schemas/user.schema.js';

const c = initContract();

export const usersContract = c.router({
  list: {
    method: 'GET',
    path: '/users',
    query: listUsersQuerySchema,
    responses: { 200: paginatedUsersSchema },
    summary: 'List users',
  },
  get: {
    method: 'GET',
    path: '/users/:id',
    pathParams: userIdParamsSchema,
    responses: { 200: userSchema, 404: errorResponseSchema },
    summary: 'Get a user by id',
  },
  create: {
    method: 'POST',
    path: '/users',
    body: createUserInputSchema,
    responses: { 201: userSchema, 409: errorResponseSchema },
    summary: 'Create a user',
  },
  update: {
    method: 'PATCH',
    path: '/users/:id',
    pathParams: userIdParamsSchema,
    body: updateUserInputSchema,
    responses: { 200: userSchema, 404: errorResponseSchema, 409: errorResponseSchema },
    summary: 'Update a user',
  },
  remove: {
    method: 'DELETE',
    path: '/users/:id',
    pathParams: userIdParamsSchema,
    body: c.noBody(),
    responses: { 204: c.noBody(), 404: errorResponseSchema },
    summary: 'Delete a user',
  },
});
