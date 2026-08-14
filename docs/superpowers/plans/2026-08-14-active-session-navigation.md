# Active-Session Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active training session easy to get back to from anywhere: a banner at the top of `/tracker`, the Tracking nav icon jumping straight to it, and a back link on the session page itself.

**Architecture:** Three independent wiring changes, all reading the existing `useActiveSession()` selector from `apps/web/src/lib/active-session-store.ts` — no new state, no schema/contract changes.

**Tech Stack:** Next.js (App Router, Server + Client Components), the existing `active-session-store` (zustand).

## Global Constraints

- No database or contract changes.
- Preserve the existing en/pl i18n dictionary structure — every new user-facing string needs both locales.
- No live-ticking clock in the tracker-page banner (static message only, per the approved design).
- The session-page back link must only navigate — it must not call `end()` or otherwise touch the active-session store.

---

### Task 1: Active-session banner on `/tracker`

**Files:**
- Create: `apps/web/src/components/active-session-banner.tsx`
- Modify: `apps/web/src/app/tracker/page.tsx`
- Modify: `apps/web/src/lib/i18n/dictionaries/en.ts`
- Modify: `apps/web/src/lib/i18n/dictionaries/pl.ts`

**Interfaces:**
- Consumes: `useActiveSession()` from `@/lib/active-session-store` (returns `{ sessionId: string; startedAt: number } | null`).
- Produces: `ActiveSessionBanner` — a self-contained client component taking no props, rendering `null` when idle.

- [ ] **Step 1: Add the new dictionary strings**

In `apps/web/src/lib/i18n/dictionaries/en.ts`, add to the `tracker` object:

```ts
    activeSessionMessage: 'Training in progress',
    continue: 'Continue',
```

In `apps/web/src/lib/i18n/dictionaries/pl.ts`, add to the `tracker` object:

```ts
    activeSessionMessage: 'Trening w toku',
    continue: 'Kontynuuj',
```

- [ ] **Step 2: Create the banner component**

Create `apps/web/src/components/active-session-banner.tsx`:

```tsx
'use client';

import { Card, Text } from '@acme/ui';
import Link from 'next/link';
import { useActiveSession } from '@/lib/active-session-store';
import { useLocale } from '@/lib/i18n/context';

export function ActiveSessionBanner() {
  const { dict } = useLocale();
  const activeSession = useActiveSession();

  if (!activeSession) return null;

  return (
    <Card className="glass-panel border-primary flex items-center justify-between gap-3 border">
      <Text className="font-medium">{dict.tracker.activeSessionMessage}</Text>
      <Link
        href={`/tracker/${activeSession.sessionId}`}
        className="bg-primary text-primary-foreground font-data rounded-full px-4 py-2 text-xs uppercase transition-colors active:scale-95"
      >
        {dict.tracker.continue}
      </Link>
    </Card>
  );
}
```

- [ ] **Step 3: Render it at the top of the tracker page**

In `apps/web/src/app/tracker/page.tsx`, add the import:

```ts
import { ActiveSessionBanner } from '@/components/active-session-banner';
```

Then render `<ActiveSessionBanner />` right after the "Tracking" heading and before the "Start a Workout" section — change:

```tsx
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          {dict.nav.tracking}
        </Text>

        <div className="flex flex-col gap-3">
```

to:

```tsx
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          {dict.nav.tracking}
        </Text>

        <ActiveSessionBanner />

        <div className="flex flex-col gap-3">
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

Manually: with no active session, confirm nothing renders between the heading and "Start a Workout" (no empty gap, no stray card). Start a session, return to `/tracker`, confirm the banner appears with a working "Continue" link that lands on that session's page.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/active-session-banner.tsx apps/web/src/app/tracker/page.tsx apps/web/src/lib/i18n/dictionaries/en.ts apps/web/src/lib/i18n/dictionaries/pl.ts
git commit -m "feat(web): show an active-session banner at the top of the tracker page"
```

---

### Task 2: Tracking nav link follows the active session

**Files:**
- Modify: `apps/web/src/components/bottom-nav.tsx`

**Interfaces:**
- Consumes: `useActiveSession()` (already called in this file for the pulsing badge — no new call needed).

- [ ] **Step 1: Compute a per-item target href**

In `apps/web/src/components/bottom-nav.tsx`, inside the mobile tab bar's `.map(...)` callback, change:

```tsx
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          const label = dict.nav[labelKey];
          const showActiveBadge = href === '/tracker' && activeSession !== null;
          return (
            <Link
              key={href}
              href={href}
```

to:

```tsx
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          const label = dict.nav[labelKey];
          const showActiveBadge = href === '/tracker' && activeSession !== null;
          const targetHref =
            href === '/tracker' && activeSession ? `/tracker/${activeSession.sessionId}` : href;
          return (
            <Link
              key={href}
              href={targetHref}
```

Make the identical change in the desktop floating dock's `.map(...)` callback (same brief: `const targetHref = ...` added right after `showActiveBadge`, and `href={href}` on the `<Link>` changed to `href={targetHref}`).

Do NOT change the `isNavLinkActive(pathname, href)` call itself — it must keep using the original `href` (`/tracker`), not `targetHref`. `isNavLinkActive` does a `pathname.startsWith(href)` check, and `/tracker/[id]` already starts with `/tracker`, so the Tracking tab correctly highlights as active whether you're on the overview or inside a session — no change needed there.

- [ ] **Step 2: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

Manually: with no active session, confirm the Tracking icon still links to `/tracker` from every page. Start a session, navigate to a different tab (e.g. Plans), confirm the Tracking icon now links straight to `/tracker/<that session's id>` in both the mobile tab bar and the desktop dock, and that the icon still shows as "active" (highlighted) when you're actually on that session's page.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/bottom-nav.tsx
git commit -m "feat(web): Tracking nav link jumps to the active session"
```

---

### Task 3: Back link on the session page

**Files:**
- Modify: `apps/web/src/components/session-detail.tsx`

**Interfaces:**
- None new — pure navigation, no store interaction.

- [ ] **Step 1: Add the icon import**

In `apps/web/src/components/session-detail.tsx`, change:

```ts
import { CheckCircle2, Flag, Timer, Trash2, X } from 'lucide-react';
```

to:

```ts
import { ArrowLeft, CheckCircle2, Flag, Timer, Trash2, X } from 'lucide-react';
```

- [ ] **Step 2: Add the back link as the first element in the returned JSX**

Change:

```tsx
  return (
    <Stack gap="lg" className="pb-24">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
```

to:

```tsx
  return (
    <Stack gap="lg" className="pb-24">
      <Link
        href="/tracker"
        className="text-muted-foreground hover:text-primary flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.nav.tracking}
      </Link>

      <div className="flex flex-col items-center gap-2 pt-4 text-center">
```

`Link` from `next/link` is already imported in this file (used by the "already active" block message further down) — no new import needed for it. This reuses the existing `dict.nav.tracking` label ("Tracking"/"Śledzenie") — no new i18n key needed.

This link only navigates to `/tracker` — it does not call `end()`, does not check `isThisSessionActive`, and does not touch the active-session store in any way. Leaving via this link behaves exactly like leaving via any other nav tab already does today.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @acme/web typecheck && pnpm --filter @acme/web lint`
Expected: both pass.

- [ ] **Step 4: Manually verify the full three-task flow together**

Start a session (Start button on its page). Confirm: the tracker-page banner (Task 1) now shows it; the Tracking nav icon (Task 2) now points straight at it from any other tab; the back link (Task 3) takes you to `/tracker` without stopping the timer — confirm by checking the banner and nav badge are still showing it active immediately after using the back link.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/session-detail.tsx
git commit -m "feat(web): add a back link to the tracker overview on the session page"
```
