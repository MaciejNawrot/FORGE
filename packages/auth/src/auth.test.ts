import { describe, expect, it } from 'vitest';
import { auth } from './auth.js';

describe('auth', () => {
  it('constructs a betterAuth instance with the expected api surface', () => {
    expect(auth).toBeDefined();
    expect(auth.api.signUpEmail).toBeTypeOf('function');
    expect(auth.api.signInEmail).toBeTypeOf('function');
    expect(auth.api.signOut).toBeTypeOf('function');
    expect(auth.api.getSession).toBeTypeOf('function');
  });

  it('exposes the emailAndPassword and bearer configuration', () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.plugins?.some((plugin) => plugin.id === 'bearer')).toBe(true);
  });
});
