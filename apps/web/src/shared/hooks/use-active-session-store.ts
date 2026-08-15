import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

type ActiveSessionState = {
  activeSessionId: string | null;
  startedAt: number | null;
  start: (sessionId: string) => void;
  end: () => void;
};

export const useActiveSessionStore = create<ActiveSessionState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      startedAt: null,
      start: (sessionId) => set({ activeSessionId: sessionId, startedAt: Date.now() }),
      end: () => set({ activeSessionId: null, startedAt: null }),
    }),
    { name: 'gym0-active-session' },
  ),
);

export function isSessionExpired(startedAt: number, now: number): boolean {
  return now - startedAt > FOUR_HOURS_MS;
}

/** The store's active session, or null if none is set or it's older than 4 hours. */
export function useActiveSession(): { sessionId: string; startedAt: number } | null {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const activeSessionId = useActiveSessionStore((state) => state.activeSessionId);
  const startedAt = useActiveSessionStore((state) => state.startedAt);
  if (!hydrated || !activeSessionId || !startedAt) return null;
  if (isSessionExpired(startedAt, Date.now())) return null;
  return { sessionId: activeSessionId, startedAt };
}
