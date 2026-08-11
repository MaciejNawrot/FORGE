import { initContract } from '@ts-rest/core';
import { authContract } from './auth.contract.js';
import { exercisesContract } from './exercises.contract.js';
import { trainingContract } from './training.contract.js';
import { usersContract } from './users.contract.js';
import { workoutsContract } from './workouts.contract.js';

const c = initContract();

export const contract = c.router(
  {
    auth: authContract,
    users: usersContract,
    workouts: workoutsContract,
    exercises: exercisesContract,
    training: trainingContract,
  },
  { strictStatusCodes: true },
);

export * from './auth.contract.js';
export * from './exercises.contract.js';
export * from './training.contract.js';
export * from './users.contract.js';
export * from './workouts.contract.js';
