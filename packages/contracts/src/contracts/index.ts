import { initContract } from '@ts-rest/core';
import { authContract } from './auth.contract.js';
import { usersContract } from './users.contract.js';

const c = initContract();

export const contract = c.router(
  {
    auth: authContract,
    users: usersContract,
  },
  { strictStatusCodes: true },
);

export * from './auth.contract.js';
export * from './users.contract.js';
