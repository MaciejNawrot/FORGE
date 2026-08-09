import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('lets a later Tailwind class win a conflict', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('bg-primary', 'bg-destructive')).toBe('bg-destructive');
  });

  it('keeps non-conflicting Tailwind classes', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });
});
