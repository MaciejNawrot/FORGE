import { useEffect, useState } from 'react';

export function useElapsedTime(since: number | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since == null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [since]);

  if (since == null) return '0:00';

  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useCountdown(
  active: boolean,
  seconds: number,
): { remaining: number; setRemaining: (value: number) => void; display: string; done: boolean } {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
    // `seconds` seeds `remaining` only when a rest period starts (active
    // flips false -> true). It's deliberately left out of the dependency
    // array: a caller changing the target duration mid-rest (+15s, manual
    // edit) must not restart the tick and wipe elapsed progress — callers
    // use the returned `setRemaining` directly for that instead.
  }, [active]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return {
    remaining,
    setRemaining,
    display: `${minutes}:${String(secs).padStart(2, '0')}`,
    done: remaining === 0,
  };
}
