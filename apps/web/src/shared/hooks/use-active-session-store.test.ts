import { beforeEach, describe, expect, it } from 'vitest';
import { isSessionExpired, useActiveSessionStore } from './use-active-session-store';

describe('useActiveSessionStore', () => {
  beforeEach(() => {
    useActiveSessionStore.setState({ activeSessionId: null, startedAt: null });
  });

  it('start sets the active session id and a startedAt timestamp', () => {
    useActiveSessionStore.getState().start('session-1');

    const state = useActiveSessionStore.getState();
    expect(state.activeSessionId).toBe('session-1');
    expect(state.startedAt).not.toBeNull();
  });

  it('end clears the active session', () => {
    useActiveSessionStore.getState().start('session-1');
    useActiveSessionStore.getState().end();

    const state = useActiveSessionStore.getState();
    expect(state.activeSessionId).toBeNull();
    expect(state.startedAt).toBeNull();
  });
});

describe('isSessionExpired', () => {
  it('is false for a session that just started', () => {
    const now = Date.now();
    expect(isSessionExpired(now, now)).toBe(false);
  });

  it('is true for a session started more than 4 hours ago', () => {
    const now = Date.now();
    const fourHoursAndOneMsAgo = now - 4 * 60 * 60 * 1000 - 1;
    expect(isSessionExpired(fourHoursAndOneMsAgo, now)).toBe(true);
  });

  it('is false for a session started just under 4 hours ago', () => {
    const now = Date.now();
    const justUnderFourHoursAgo = now - 4 * 60 * 60 * 1000 + 1000;
    expect(isSessionExpired(justUnderFourHoursAgo, now)).toBe(false);
  });
});
