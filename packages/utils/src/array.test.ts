import { describe, expect, it } from 'vitest';
import { chunk, uniqueBy } from './array.js';

describe('chunk', () => {
  it('splits an array into chunks of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('throws for a non-positive size', () => {
    expect(() => chunk([1, 2], 0)).toThrow(RangeError);
  });
});

describe('uniqueBy', () => {
  it('deduplicates items by a derived key', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    expect(uniqueBy(items, (item) => item.id)).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
