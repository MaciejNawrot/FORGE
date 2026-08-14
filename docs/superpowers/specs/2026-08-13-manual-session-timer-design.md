# Manual session timer & single active session — design

## Problem

Today any training session detail page (`/tracker/[id]`) shows a live, auto-running duration counter the instant it renders — `useElapsedTime` in `session-detail.tsx` computes elapsed time from `session.createdAt` and starts ticking on mount, with no user control. This causes three real problems:

- Creating a session (via "Zapisz trening" or "Rozpocznij" on a plan) immediately starts the clock, with no way to say "not yet, I haven't started lifting."
- Opening any past session from "Ostatnie Treningi" shows the exact same ticking-clock UI, making an old, finished training look like it's actively resuming.
- Nothing prevents more than one session from appearing "active" at once (e.g. two browser tabs, or navigating away and back), and there's no persistent, cross-navigation notion of "a training is currently in progress" to show anywhere else in the app (like the bottom nav).

## Decision

Introduce a small persisted client-side store (`zustand`, with its `persist` middleware backed by `localStorage`) holding at most one active session: `{ sessionId, startedAt }`. A session only counts as "active" once its **Start** button is explicitly pressed on its own detail page — not merely when the underlying database row is created. This single distinction resolves all three problems with one mechanism:

- A freshly created session and an old session opened from history are handled by the exact same code path: if the page's session isn't the one in the store, show an idle "Start" state instead of a ticking clock. No new "finished" concept or database field needed.
- The store is keyed by `sessionId`, not by which page happens to be mounted, so it survives navigating to other routes and reloading the page (that's what `persist` is for).
- Every other UI that cares (the bottom nav badge, the "already active" block) reads the same single store.

Session **creation** (`start-plan-button.tsx`, `add-training-form.tsx`) is unchanged and does not touch the store — only pressing Start on the resulting detail page does. This keeps the concurrency guard in exactly one place instead of duplicating an active-check at every creation call site.

## Components

- **`apps/web/src/lib/active-session-store.ts`** (new) — the zustand store. State: `activeSessionId: string | null`, `startedAt: number | null` (epoch ms). Actions: `start(sessionId: string)`, `end()`. A selector/getter (`getActiveSession()`) treats an entry as expired once `Date.now() - startedAt > 4 * 60 * 60 * 1000` (4 hours) — expired entries read as `null` and are opportunistically cleared via the same call, so no background timer/interval is needed purely for expiry. Persisted via zustand's `persist` middleware to `localStorage`.

- **`apps/web/src/components/session-detail.tsx`**:
  - `useElapsedTime(session.createdAt)` is replaced by a read from the store's `startedAt` for *this* session — only when `activeSessionId === session.id`.
  - When the store's active session is NOT this one (covers: freshly created & not yet started, or any other session viewed from history), render an idle state: the duration digits are replaced by a **Start** button.
  - Pressing Start: if a *different* session is currently active, show an inline blocking message ("You already have an active training in progress") with a link to jump to that session, and do not start this one. Otherwise, call `start(session.id)` from the store.
  - The existing "Finish" button/flow (already a `ConfirmButton` that navigates back to `/tracker`) additionally calls `end()` on confirm, clearing the store — this is the only "stop" action; there's no separate End button.
  - `AddSessionExerciseCard`, the exercise list, delete, and notes are unchanged and remain fully usable regardless of Start/idle state.

- **`apps/web/src/components/bottom-nav.tsx`** — reads `activeSessionId` from the store; renders a small indicator (pulsing dot) on the Tracking tab's icon while a session is active. Uses the existing `Timer` icon already assigned to that tab (`nav-links.ts`) — no icon swap needed, just an overlay badge.

- **`apps/web/src/lib/i18n/dictionaries/{en,pl}.ts`** — new strings under `activeTracking`: a `start` label for the idle-state button, and an `alreadyActive` message + `goToActive` link label for the block.

- **New dependency**: `zustand`. Not currently in the repo (checked). Add via `pnpm add zustand --filter @acme/web`, then move the resolved version into `pnpm-workspace.yaml`'s `catalog:` block (matching how every other shared dependency in `apps/web/package.json` is pinned) and reference it as `"catalog:"` in `apps/web/package.json`, consistent with existing convention. Don't hand-pick a version number — let `pnpm add` resolve it.

## Data flow

Create session (unchanged, no store interaction) → land on detail page → store doesn't have this session's id → idle state, Start button shown → press Start → blocked-check against store: if empty or expired, `start(session.id)` → digits tick from `startedAt`, bottom nav badge appears → free navigation, store persists across route changes and reloads → press Finish → `end()` clears the store, digits stop, badge disappears, navigate to `/tracker`.

Opening a second session while one is active: its page reads the store, sees `activeSessionId` doesn't match, renders idle with a Start button; pressing that Start button hits the blocking message instead of starting a second clock.

## Error handling / edge cases

- **4h auto-expiry** is computed on every read, not via a background interval — simplest correct implementation for this scale (no service worker, no server involvement, just a `Date.now()` comparison at render/action time).
- **Known, deliberate non-fix**: because "active" is a purely client-side concept (no database status field, as requested), if nothing is currently active, opening a very old session from history and pressing Start would start timing that old record — there's no server-side "already finished" flag preventing it. In practice the only realistic path is pressing Start right after creating a session, so this is left as-is rather than adding new schema/contract scope.
- If `localStorage` is unavailable (private browsing edge cases) `persist` degrades to in-memory only — acceptable, not specially handled.

## Testing

- Unit tests for the store's pure logic: `start`/`end` set and clear state correctly; a `startedAt` older than 4 hours reads as inactive; a fresh `startedAt` reads as active. Same lightweight pattern as the existing `muscle-fatigue.ts` test.
- Manual verification: create a session, confirm it's idle (no ticking) until Start is pressed; open a different, older session while one is active and confirm it shows idle, not ticking; try to Start a second session while one is active and confirm the block message with a working jump-to link; confirm the bottom nav badge appears/disappears with Start/Finish; confirm Finish clears the store (badge disappears) and navigates back.

## Out of scope

- No database schema or contract changes — "active" stays a client-only concept, per the explicit decision to have zustand own it.
- No separate "End" control distinct from "Finish" — they're the same action.
- No change to exercise logging availability based on timer state.
- No cross-tab sync of the active session. `localStorage` is shared per-browser, but the store only re-reads it on mount — a second tab opened before a first tab's `start()` won't see it and could start its own session, overwriting the first tab's entry. The original problem statement cited two tabs as a cause of "more than one active session"; this only fixes it for sequential navigation within a tab (or a fresh tab load), not two tabs open and interacted with concurrently. Deliberately left out — a `storage`-event listener is real complexity for a single-user app where this is an edge case, not the common path.
- No cross-device sync of "active session" (localStorage is per-browser).
