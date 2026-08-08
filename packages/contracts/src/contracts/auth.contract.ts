import { initContract } from '@ts-rest/core';
import { loginInputSchema, registerInputSchema, sessionSchema } from '../schemas/auth.schema.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

const c = initContract();

export const authContract = c.router({
  register: {
    method: 'POST',
    path: '/auth/register',
    body: registerInputSchema,
    responses: { 201: sessionSchema, 409: errorResponseSchema },
    summary: 'Register a new account',
  },
  login: {
    method: 'POST',
    path: '/auth/login',
    body: loginInputSchema,
    responses: { 200: sessionSchema, 401: errorResponseSchema },
    summary: 'Log in with email and password',
  },
  logout: {
    method: 'POST',
    path: '/auth/logout',
    body: c.noBody(),
    responses: { 204: c.noBody() },
    summary: 'Log out of the current session',
  },
  session: {
    method: 'GET',
    path: '/auth/session',
    responses: { 200: sessionSchema, 401: errorResponseSchema },
    summary: 'Get the current session',
  },
});
