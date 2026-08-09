import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from './client.js';
import { users } from './schema/users.js';

describe('db client', () => {
  it('constructs a drizzle instance without connecting', () => {
    expect(db).toBeDefined();
  });
});

describe('users schema', () => {
  it('defines the expected columns', () => {
    const columns = getTableColumns(users);
    expect(Object.keys(columns)).toEqual(['id', 'email', 'name', 'createdAt', 'updatedAt']);
  });

  it('marks email and name as required', () => {
    const columns = getTableColumns(users);
    expect(columns.email.notNull).toBe(true);
    expect(columns.name.notNull).toBe(true);
  });

  it('uses the snake_case db column names', () => {
    const columns = getTableColumns(users);
    expect(columns.createdAt.name).toBe('created_at');
    expect(columns.updatedAt.name).toBe('updated_at');
  });
});
