import { afterEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    vi.resetModules();
  });

  it('fails fast when DATABASE_URL is not a valid url', async () => {
    process.env.DATABASE_URL = 'not-a-url';
    vi.resetModules();
    await expect(import('./env.js')).rejects.toThrow();
  });

  it('loads successfully when DATABASE_URL is valid', async () => {
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/acme_test';
    vi.resetModules();
    const { env } = await import('./env.js');
    expect(env.DATABASE_URL).toBe('postgres://postgres:postgres@localhost:5432/acme_test');
  });
});
