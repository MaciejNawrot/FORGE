import { describe, expect, it } from 'vitest';
import { omit, pick } from './object.js';

const obj = { a: 1, b: 2, c: 3 };

describe('pick', () => {
  it('keeps only the given keys', () => {
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
});

describe('omit', () => {
  it('drops the given keys', () => {
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });
});
