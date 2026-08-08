export function chunk<T>(items: readonly T[], size: number): T[][] {
  invariantPositive(size);
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export function uniqueBy<T, K>(items: readonly T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(item);
    }
  }
  return result;
}

function invariantPositive(size: number): void {
  if (size <= 0) {
    throw new RangeError('chunk size must be a positive integer');
  }
}
