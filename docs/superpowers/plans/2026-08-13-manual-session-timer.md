# Manual Session Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the auto-ticking session duration (which starts the instant any session page renders, past or present) with a manually-started, single-active-session timer backed by a persisted client store, plus a bottom-nav indicator while a session is active.

**Architecture:** A small `zustand` store (persisted to `localStorage`) holds at most one `{ activeSessionId, startedAt }`. A session only counts as active once its own **Start** button is pressed — opening any other session (fresh or historical) always renders idle. The existing "Finish" action doubles as "End."

**Tech Stack:** Next.js (App Router, Client Components), `zustand` (new dependency) with its `persist` middleware, Vitest.

## Global Constraints

- One approved new dependency: `zustand`. Install via `pnpm add zustand --filter @acme/web`, then pin whatever version pnpm resolves into `pnpm-workspace.yaml`'s `catalog:` block and reference it as `"catalog:"` in `apps/web/package.json` — matching how every other shared dependency in that file is already pinned. Do not hand-pick a version number.
- No database or contract changes — "active" stays purely client-side.
- No separate "End" control distinct from "Finish" — they're the same action.
- Preserve the existing en/pl i18n dictionary structure — every new user-facing string needs both locales.

---

### Task 1: `active-session-store.ts` — the zustand store

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-workspace.yaml`
- Create: `apps/web/src/lib/active-session-store.ts`
- Create: `apps/web/src/lib/active-session-store.test.ts`

**Interfaces:**
- Produces: `useActiveSessionStore` (a zustand hook/store with `activeSessionId: string | null`, `startedAt: number | null`, `start(sessionId: string): void`, `end(): void`), `useActiveSession(): { sessionId: string; startedAt: number } | null` (a selector hook that treats an entry older than 4 hours as absent), `isSessionExpired(startedAt: number, now: number): boolean`. Consumed by Task 2 and Task 3.

- [ ] **Step 1: Install zustand**

Run: `pnpm add zustand --filter @acme/web`

Open `apps/web/package.json` and note the exact version pnpm wrote for `"zustand"` in `dependencies` (e.g. `"^5.0.3"` — use whatever you actually see, don't assume this example).

- [ ] **Step 2: Pin it in the workspace catalog**

In `pnpm-workspace.yaml`, add a line to the `catalog:` block (alphabetical position doesn't matter — the existing list isn't strictly sorted, e.g. `drizzle-orm` appears twice near the top and other entries are grouped by area — just add it near other frontend entries like `react-hook-form`):

```yaml
  zustand: <the exact version from Step 1, without the ^ prefix>
```

Then change `apps/web/package.json`'s `"zustand"` entry from whatever `pnpm add` wrote to `"catalog:"`, matching the style of `"react-hook-form": "catalog:"` two lines above it.

Run: `pnpm install`
Expected: completes with no errors, lockfile updates.

- [ ] **Step 3: Write the failing test**

Create `apps/web/src/lib/active-session-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { isSessionExpired, useActiveSessionStore } from './active-session-store';

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
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `pnpm --filter @acme/web test -- active-session-store.test.ts`
Expected: FAIL — `./active-session-store` doesn't exist yet.

- [ ] **Step 5: Implement it**

Create `apps/web/src/lib/active-session-store.ts`:

```ts
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
  const activeSessionId = useActiveSessionStore((state) => state.activeSessionId);
  const startedAt = useActiveSessionStore((state) => state.startedAt);
  if (!activeSessionId || !startedAt) return null;
  if (isSessionExpired(startedAt, Date.now())) return null;
  return { sessionId: activeSessionId, startedAt };
}
```

- [ ] **Step 6: Run it to confirm it passes**

Run: `pnpm --filter @acme/web test -- active-session-store.test.ts`
Expected: PASS (5/5).

- [ ] **Step 7: Verify the whole package still typechecks**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json pnpm-workspace.yaml pnpm-lock.yaml apps/web/src/lib/active-session-store.ts apps/web/src/lib/active-session-store.test.ts
git commit -m "feat(web): add zustand-backed active-session store"
```

---

### Task 2: Manual Start/Finish in `SessionDetail`

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`
- Modify: `apps/web/src/lib/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/lib/i18n/dictionaries/pl.ts`

**Interfaces:**
- Consumes: `useActiveSession`, `useActiveSessionStore` from `apps/web/src/lib/active-session-store.ts` (Task 1).

**Note on file drift:** if a different plan has already modified `session-detail.tsx` (e.g. added a "Suggested Next" section, or lifted `AddSessionExerciseCard`'s state into `SessionDetail`), the exact line numbers and surrounding code below may not match verbatim. Locate the described regions by their content/purpose (the duration display block, the `useElapsedTime` helper, the Finish `ConfirmButton`) rather than assuming an exact line match, and apply the same net change described here. If something looks genuinely different from what's described, stop and report NEEDS_CONTEXT with what you found instead of guessing.

- [ ] **Step 1: Add the new dictionary strings**

In `apps/web/src/lib/i18n/dictionaries/en.ts`, add to `activeTracking`:

```ts
    start: 'Start',
    alreadyActive: 'You already have an active training in progress.',
    goToActive: 'Go to it',
```

(alongside the existing `duration`, `logSet`, `previousSets`, `resting`, `lastTime`, `alreadyTrained` keys — exact position within the object doesn't matter).

In `apps/web/src/lib/i18n/dictionaries/pl.ts`, add to `activeTracking`:

```ts
    start: 'Rozpocznij',
    alreadyActive: 'Masz już aktywny trening w toku.',
    goToActive: 'Przejdź do niego',
```

- [ ] **Step 2: Make `useElapsedTime` accept `null` (idle, no ticking)**

In `apps/web/src/components/session-detail.tsx`, replace the `useElapsedTime` helper — from:

```ts
function useElapsedTime(since: Date | string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Crossing the Server -> Client Component boundary serializes `Date` props
  // to plain ISO strings, so this can't assume `since` is still a `Date`.
  const sinceMs = since instanceof Date ? since.getTime() : new Date(since).getTime();
  const elapsed = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
```

to:

```ts
function useElapsedTime(since: Date | string | number | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since == null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [since]);

  if (since == null) return '0:00';

  // Crossing the Server -> Client Component boundary serializes `Date` props
  // to plain ISO strings, so this can't assume `since` is still a `Date`.
  const sinceMs =
    typeof since === 'number' ? since : since instanceof Date ? since.getTime() : new Date(since).getTime();
  const elapsed = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
```

- [ ] **Step 3: Add the import**

Add to the import list at the top of the file:

```ts
import Link from 'next/link';
```

```ts
import { useActiveSession, useActiveSessionStore } from '@/lib/active-session-store';
```

- [ ] **Step 4: Replace the duration source and add Start/block state**

Inside `SessionDetail`, replace:

```ts
  const duration = useElapsedTime(session.createdAt);
```

with:

```ts
  const activeSession = useActiveSession();
  const isThisSessionActive = activeSession !== null && activeSession.sessionId === session.id;
  const duration = useElapsedTime(
    activeSession && isThisSessionActive ? activeSession.startedAt : null,
  );
  const start = useActiveSessionStore((state) => state.start);
  const end = useActiveSessionStore((state) => state.end);
  const [blocked, setBlocked] = useState(false);

  const handleStart = () => {
    if (activeSession && activeSession.sessionId !== session.id) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    start(session.id);
  };
```

- [ ] **Step 5: Render Start button when idle, ticking clock when active**

Replace the duration display block — from:

```tsx
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
          {dict.activeTracking.duration}
        </Text>
        <span className="font-display text-glow-primary text-primary text-6xl tabular-nums">
          {duration}
        </span>
        <div className="flex items-center gap-2">
```

to:

```tsx
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
          {dict.activeTracking.duration}
        </Text>
        {isThisSessionActive ? (
          <span className="font-display text-glow-primary text-primary text-6xl tabular-nums">
            {duration}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="bg-primary text-primary-foreground font-display glow-primary rounded-full px-8 py-3 text-2xl uppercase tracking-wider transition-colors active:scale-95"
          >
            {dict.activeTracking.start}
          </button>
        )}
        {blocked && activeSession && (
          <Text tone="destructive" variant="caption">
            {dict.activeTracking.alreadyActive}{' '}
            <Link href={`/tracker/${activeSession.sessionId}`} className="underline">
              {dict.activeTracking.goToActive}
            </Link>
          </Text>
        )}
        <div className="flex items-center gap-2">
```

(the rest of that `<div className="flex items-center gap-2">...</div>` block — the training-type badge and the delete `ConfirmButton` — is unchanged; only the opening of the surrounding parent block changes, as shown by the matching indentation above.)

- [ ] **Step 6: Make Finish also end the active session**

Find the Finish `ConfirmButton` (identifiable by `title={dict.sessionDetail.finishTitle}`), and change its `onConfirm` from:

```tsx
          onConfirm={() => router.push('/tracker')}
```

to:

```tsx
          onConfirm={() => {
            if (isThisSessionActive) end();
            router.push('/tracker');
          }}
```

- [ ] **Step 7: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

- [ ] **Step 8: Manually verify the full flow**

Create a session (either path) — confirm it lands idle with a "Start" button, no ticking clock. Press Start — confirm the clock begins ticking. Open a second, different session in another tab or by navigating — confirm it shows idle (not ticking), and pressing its Start shows the "already active" message with a working "Go to it" link back to the first session. Press Finish on the active session — confirm the clock stops and the store clears (verify by returning to the tracker page and checking Task 3's nav badge disappears, once Task 3 is done — for now just confirm no console errors and `useActiveSessionStore.getState()` is `{ activeSessionId: null, startedAt: null }` after Finish, checkable via browser devtools).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/session-detail.tsx apps/web/src/lib/i18n/dictionaries/en.ts apps/web/src/lib/i18n/dictionaries/pl.ts
git commit -m "feat(web): manual Start/Finish timer, single active session enforcement"
```

---

### Task 3: Bottom nav active-training indicator

**Files:**
- Modify: `apps/web/src/components/bottom-nav.tsx`

**Interfaces:**
- Consumes: `useActiveSession` from `apps/web/src/lib/active-session-store.ts` (Task 1).

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `apps/web/src/components/bottom-nav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActiveSession } from '@/lib/active-session-store';
import { useLocale } from '@/lib/i18n/context';
import { isNavLinkActive, primaryNavLinks } from '@/lib/nav-links';

export function BottomNav() {
  const pathname = usePathname();
  const { dict } = useLocale();
  const activeSession = useActiveSession();

  return (
    <>
      {/* Mobile tab bar */}
      <nav className="glass-panel fixed bottom-0 z-50 flex w-full items-center justify-around rounded-t-xl px-4 pt-2 pb-4 md:hidden">
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          const label = dict.nav[labelKey];
          const showActiveBadge = href === '/tracker' && activeSession !== null;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 rounded-full px-4 py-1 transition-all active:scale-90 ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {showActiveBadge && (
                  <span
                    className="bg-primary absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="font-data text-[10px] uppercase">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop floating dock */}
      <nav className="glass-panel fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-1 rounded-full p-2 md:flex">
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          const label = dict.nav[labelKey];
          const showActiveBadge = href === '/tracker' && activeSession !== null;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
                active
                  ? 'bg-primary text-primary-foreground glow-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {showActiveBadge && (
                  <span
                    className="bg-primary absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

- [ ] **Step 3: Manually verify**

With no active session, confirm neither nav bar shows a dot on the Tracking icon. Start a session (Task 2's Start button), confirm a small pulsing dot appears on the Tracking tab in both the mobile tab bar and the desktop dock, and persists while navigating to other tabs. Finish the session, confirm the dot disappears.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/bottom-nav.tsx
git commit -m "feat(web): show an active-training indicator on the bottom nav"
```
