import { describe, expect, it } from 'vitest';
import { createApiClient } from './client.js';

describe('createApiClient', () => {
  it('builds a proxy client exposing every contract route', () => {
    const client = createApiClient({ baseUrl: 'http://localhost:3001' });

    expect(client.users.list).toBeTypeOf('function');
    expect(client.users.get).toBeTypeOf('function');
    expect(client.users.create).toBeTypeOf('function');
    expect(client.users.update).toBeTypeOf('function');
    expect(client.users.remove).toBeTypeOf('function');
    expect(client.auth.register).toBeTypeOf('function');
    expect(client.auth.login).toBeTypeOf('function');
    expect(client.auth.logout).toBeTypeOf('function');
    expect(client.auth.session).toBeTypeOf('function');
  });

  it('defaults credentials to include, for cookie-based auth', async () => {
    const requests: RequestInit[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      requests.push(init ?? {});
      return new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const client = createApiClient({ baseUrl: 'http://localhost:3001' });
      await client.users.list({ query: { page: 1, pageSize: 20 } });
      expect(requests[0]?.credentials).toBe('include');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
