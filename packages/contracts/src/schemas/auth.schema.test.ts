import { describe, expect, it } from 'vitest';
import { loginInputSchema, registerInputSchema } from './auth.schema.js';

describe('registerInputSchema', () => {
  it('rejects a password shorter than 8 characters', () => {
    const result = registerInputSchema.safeParse({
      email: 'ada@example.com',
      password: 'short',
      name: 'Ada',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid registration payload', () => {
    const result = registerInputSchema.safeParse({
      email: 'ada@example.com',
      password: 'correct-horse-battery-staple',
      name: 'Ada Lovelace',
    });
    expect(result.success).toBe(true);
  });
});

describe('loginInputSchema', () => {
  it('rejects an empty password', () => {
    expect(loginInputSchema.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(
      false,
    );
  });
});
