# Active-session navigation — design

## Problem

The manual-session-timer feature (merged) added a persisted `useActiveSession()` store so at most one training session is "active" at a time, with a nav-badge indicator. But finding your way back into that active session is still awkward: the only path is scrolling down `/tracker` to "Ostatnie Treningi" and picking it out of the history list. The Tracking nav icon always goes to the plain `/tracker` overview, never straight to the session in progress. And once inside the active session, there's no direct way back to the tracker overview besides Finish (which stops the timer) or the browser's own back button.

## Decision

Three independent, small wiring changes on top of the existing `active-session-store` — no new state, no schema/contract changes.

1. **Top-of-tracker banner.** A new client component, `ActiveSessionBanner`, rendered as the first element inside `/tracker`'s page body (above "Start a Workout"). Reads `useActiveSession()`; renders nothing when idle. When active, shows a static "Training in progress" card with a "Continue" link to `/tracker/${sessionId}` — no live-ticking clock, to avoid duplicating the interval-based timer logic that already lives in `SessionDetail`. "Ostatnie Treningi" is untouched — this is an additional, faster path to the same session, not a replacement.

2. **Nav link follows the active session.** In `BottomNav`, the Tracking item's `href` becomes `activeSession ? `/tracker/${activeSession.sessionId}` : '/tracker'`, computed from the same `useActiveSession()` call already used for the pulsing badge. Since that hook already gates its first render behind a `hydrated` flag (fixed in the manual-session-timer branch's final review), this is safe by construction: the first render always matches the server-rendered `/tracker` href, then updates once hydrated. Every other nav item is untouched.

3. **Back button on the session page.** A plain link back to `/tracker` at the top of `SessionDetail`, above the duration/Start block. It only navigates — it does not call `end()` or otherwise touch the active-session store, so leaving via this button behaves exactly like navigating away via any other nav tab already does today (the session keeps running in the background if it was active).

## Data flow

All three read the same `useActiveSession()` selector already built. No new store fields, no new API calls, no new persisted state. `ActiveSessionBanner` and the nav-link change both degrade to their idle behavior (`/tracker`, no banner) whenever nothing is active or before hydration completes — identical shape to how the existing nav badge already handles both cases.

## Components

- `apps/web/src/components/active-session-banner.tsx` (new) — reads `useActiveSession()`, renders `null` when idle, otherwise a `glass-panel` card matching the visual language already used on `/tracker` (see the plan-list cards), with a message and a `Link` to the session.
- `apps/web/src/app/tracker/page.tsx` — renders `<ActiveSessionBanner />` as the first child inside the page's `flex flex-col gap-6` wrapper, right after the "Tracking" heading.
- `apps/web/src/components/bottom-nav.tsx` — the Tracking item's `href` becomes conditional on `useActiveSession()` in both the mobile tab bar and the desktop dock (the same two render sites the badge already touches).
- `apps/web/src/components/session-detail.tsx` — a small back-link element added near the top of `SessionDetail`, reusing the existing `dict.nav.tracking` label (no new i18n key needed for it) with a leading arrow icon.
- i18n: two new keys for the banner (`tracker.activeSessionMessage` — "Training in progress" — and `tracker.continue` — "Continue"), both locales.

## Error handling

None of these three changes introduce new failure modes — no new network calls, no new mutations. `useActiveSession()` already returns `null` safely for "nothing active," "expired," and "not yet hydrated," and all three consumers already treat `null` as the idle case.

## Testing

No new pure logic (all three are direct store reads or plain `<Link>` navigation), consistent with how the rest of this UI layer is tested — typecheck/lint plus manual trace-through, no component-test infrastructure in this repo. Manual verification: start a session, confirm the tracker banner appears and its Continue link lands on the right session; confirm the Tracking nav icon now jumps straight into that session from anywhere in the app; confirm the session page's back link returns to `/tracker` without stopping the timer (badge/banner still show it active afterward); Finish a session and confirm the banner disappears and the nav link reverts to plain `/tracker`.

## Out of scope

- No change to "Ostatnie Treningi" — it keeps listing the active session too, just no longer the only way to reach it.
- No change to Finish/End behavior.
- No live-ticking clock in the banner.
