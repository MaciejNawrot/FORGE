import { describe, expect, it } from 'vitest';
import { InvariantError, invariant, isNonNullable } from './assert.js';

describe('invariant', () => {
  it('does not throw when condition is truthy', () => {
    expect(() => invariant(true, 'should not throw')).not.toThrow();
  });

  it('throws InvariantError with the given message when condition is falsy', () => {
    expect(() => invariant(false, 'boom')).toThrow(InvariantError);
    expect(() => invariant(0, 'boom')).toThrow('boom');
  });
});

describe('isNonNullable', () => {
  it('filters out null and undefined', () => {
    const values = [1, null, 2, undefined, 3];
    expect(values.filter(isNonNullable)).toEqual([1, 2, 3]);
  });
});
