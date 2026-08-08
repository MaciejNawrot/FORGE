import { describe, expect, it } from 'vitest';
import { createUserInputSchema, listUsersQuerySchema, userSchema } from './user.schema.js';

describe('userSchema', () => {
  it('accepts a well-formed user', () => {
    const result = userSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid id or email', () => {
    expect(
      userSchema.safeParse({
        id: 'not-a-uuid',
        email: 'not-an-email',
        name: 'Ada',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).success,
    ).toBe(false);
  });
});

describe('createUserInputSchema', () => {
  it('rejects an empty name', () => {
    const result = createUserInputSchema.safeParse({ email: 'ada@example.com', name: '' });
    expect(result.success).toBe(false);
  });
});

describe('listUsersQuerySchema', () => {
  it('defaults page and pageSize when omitted', () => {
    const result = listUsersQuerySchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerces numeric strings from query params', () => {
    const result = listUsersQuerySchema.parse({ page: '3', pageSize: '50' });
    expect(result).toEqual({ page: 3, pageSize: 50 });
  });

  it('rejects a pageSize over the max', () => {
    expect(listUsersQuerySchema.safeParse({ pageSize: 500 }).success).toBe(false);
  });
});
