import { describe, expect, it } from 'vitest';
import { buildCookieHeader } from './build-cookie-header';

describe('buildCookieHeader', () => {
  it('joins cookies into a single Cookie header value', () => {
    expect(
      buildCookieHeader([
        { name: 'better-auth.session_token', value: 'abc123' },
        { name: 'other', value: 'xyz' },
      ]),
    ).toBe('better-auth.session_token=abc123; other=xyz');
  });

  it('returns an empty string for no cookies', () => {
    expect(buildCookieHeader([])).toBe('');
  });
});
