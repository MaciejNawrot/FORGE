import { describe, expect, it, vi } from 'vitest';
import { retry, sleep } from './async.js';

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    vi.useFakeTimers();
    const promise = sleep(1000);
    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });
});

describe('retry', () => {
  it('returns the result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(retry(fn, { attempts: 3 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until attempts are exhausted, then throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'));
    await expect(retry(fn, { attempts: 3 })).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('succeeds after a transient failure', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('recovered');
    await expect(retry(fn, { attempts: 3 })).resolves.toBe('recovered');
  });
});
