# Extended component library — design

## Problem

`/components` (added earlier this session) currently demos the 7 components that already existed in `@acme/ui` — a wrapper around what was there, not a reference for what the app's design intends. The Stitch project "Elite Gym Companion" has a screen literally titled **"Extended Component Library (FORGE)"** (`projects/414301104147314841/screens/74964fe0d069404f8705d7c28b121d0e`) that's the actual target: a mockup of ~18 UI patterns (typography scale, action buttons, metric cards, workout progress card, exercise card, status badges, tab bar, rest timer widget, mini bar graph, interactive stepper, social feed snippet, filter chips, toggle switch, search input) styled per the "Performance Dark" design system, most of which don't exist as components anywhere in the codebase.

The app's existing design tokens (`packages/design-tokens`) already implement the same dark theme the Stitch mock uses — same lime primary (`#ccff00`), same charcoal surfaces, same Anton/JetBrains Mono font pairing (`.font-display` / `.font-data` in `globals.css`). The gap is components, not tokens.

## Decision

Add the missing atomic pieces to `@acme/ui` as real, reusable primitives (so future feature work — exercise library, tracker, progress — can consume them, not just this showcase page). Higher-level compositions from the mock (metric card, workout progress card, exercise card, rest timer widget, social feed snippet, icon search input) are built directly on the showcase page from those primitives — they don't get promoted to the library since nothing outside the showcase consumes them yet (YAGNI; promote when a second real consumer shows up).

No new color tokens, no new icon dependency:

- **Colors** — map Stitch's `surface-container-{lowest,low,container,high,highest}` tiers onto the existing `background`/`card`/`border`/`secondary` tokens (closest visual match, see table below). Stitch's salmon "secondary" accent (used for the rest-timer ring and "Recovery Mode" badge) maps onto our `warning` token — it's a distinct semantic (not-active, cool-down) from `primary` (lime, active/go) and `destructive` (red, alert), and `warning` is otherwise unused in the app today.
- **Fonts** — already solved: `.font-display` (Anton) and `.font-data` (JetBrains Mono) classes exist in `globals.css` and are the established call-site pattern (see `settings/page.tsx`, `app/page.tsx`) — variant + explicit className, not baked into the `Text` primitive. New `Text` variants follow the same convention (size/weight only).
- **Icons** — Stitch mock uses Material Symbols Outlined (webfont). App already depends on `lucide-react` (used in `nav.tsx`, `bottom-nav.tsx`). Map 1:1 by meaning, no new dependency.

### Color token mapping

| Stitch role | Hex | Our token |
|---|---|---|
| `surface-container-lowest` | `#0d0e12` | `background` |
| `surface-container-low` | `#1a1b1f` | `card` |
| `surface-container` | `#1e1f23` | `card` |
| `surface-container-high` | `#292a2e` | `border` |
| `surface-container-highest` | `#343539` | `secondary` |
| `primary-fixed` / `on-primary-fixed` | `#c3f400` / `#161e00` | `primary` / `primary-foreground` |
| `secondary` (salmon accent) | `#ffb4aa` | `warning` |
| `error` / `error-container` | `#ffb4ab` / `#93000a` | `destructive` |
| `on-surface-variant` | `#c4c9ac` | `muted-foreground` |

### Icon mapping

`person`→`User`, `notifications`→`Bell`, `favorite`→`Heart`, `local_fire_department`→`Flame`, `fitness_center`→`Dumbbell`, `timer`→`Timer`, `add`→`Plus`, `remove`→`Minus`, `more_horiz`→`MoreHorizontal`, `more_vert`→`MoreVertical`, `delete`→`Trash2`, `search`→`Search`, `emoji_events`→`Trophy`, `battery_charging_20`→`BatteryCharging`, `warning`→`AlertTriangle`, `check_circle`→`CheckCircle2`, `event`→`Calendar`, `chat_bubble`→`MessageCircle`, `share`→`Share2`.

## Components

New in `packages/ui/src/primitives/` (cross-platform, no DOM-only APIs):

- **`badge.tsx`** — `Badge` / `badgeVariants` (cva). Pill, icon + label, `tone: 'primary' | 'warning' | 'destructive' | 'neutral' | 'muted'`. Covers PR Alert / Recovery Mode / High Intensity / Completed / Scheduled.
- **`chip.tsx`** — `Chip` / `chipVariants`. Pill button, `selected?: boolean`. Covers both filter chips (Full Body/Push/Pull/...) and exercise tag chips (Chest/Triceps/Shoulders) — same visual, `selected` just toggles the filled-vs-outline state.
- **`switch.tsx`** — `Switch`. No existing toggle-switch pattern in the codebase (`theme-switcher.tsx` uses a swatch-grid, not a binary switch) — built fresh as the standard Tailwind peer-checkbox switch: `<input type="checkbox" className="peer sr-only">` + a styled sibling `div` using `peer-checked:` variants. Controlled/uncontrolled toggle (`checked`, `defaultChecked`, `onCheckedChange`).
- **`stepper.tsx`** — `Stepper`. `value`, `onChange`, `unit` (e.g. "LBS", "REPS"), `step?` (default 1), `min?`. Renders label/unit large in the middle (`Text` `headlineLgMobile`), −/+ icon buttons either side.
- **`segmented-control.tsx`** — `SegmentedControl`. `options: { value, label }[]`, `value`, `onChange`. Covers the ALL/STRENGTH/CARDIO tab bar.
- **`bar-graph.tsx`** — `MiniBarGraph`. `values: number[]` (0–100, already-normalized heights), optional `highlightIndex`. Plain flex/div bars, no SVG — portable.

Modified in `packages/ui/src/primitives/`:

- **`button.tsx`** — add `size: 'icon'` to `buttonVariants` (`h-12 w-12 p-0 rounded-full`), additive, no existing call sites affected.
- **`text.tsx`** — add variants `displayXl` (64px), `headlineLg` (32px), `headlineLgMobile` (28px), `dataLabel` (14px, medium, tracking-wide — same JetBrains Mono role as `code` but a distinct semantic: data readouts like "RPE 8.5 / 225 LBS", not inline code). Existing variants (`body`/`heading`/`subheading`/`caption`/`code`) are untouched.

New in `packages/ui/src/web/` (SVG, web-only):

- **`progress-ring.tsx`** — `ProgressRing`. `percent: number`, `size?`, `tone?: 'primary' | 'warning'`, `glow?: boolean`. Circular SVG progress arc (`stroke-dasharray` trick), used for the workout-progress ring and the rest-timer ring.

Page-local only (`apps/web/src/app/components/page.tsx`), composed from the primitives above plus the existing `Card`/`Input` — not exported from `@acme/ui`:

- **Metric card** — icon + label (`dataLabel`) + big number (`headlineLgMobile`) + unit, in a `Card`.
- **Workout progress card** — title/subtitle + `ProgressRing` + linear progress bar (plain div, `bg-secondary` track / `bg-primary` fill).
- **Exercise card** — icon avatar, name/cue, `Chip` tag row, footer stats row.
- **Rest timer widget** — `ProgressRing` (tone `warning`) + centered countdown text + `+15s`/`SKIP` buttons.
- **Search input** — `Input` with a leading `Search` icon absolutely positioned (no new primitive needed — `Input` already accepts `className`/padding overrides).
- **Social feed snippet** — avatar + name/timestamp row, body text, nested workout-summary card, like/comment/share action row.

## Page structure

`/components` is rewritten (not appended to) to mirror the Stitch mock's section order: Typography → Action Buttons → Data & Metrics → Exercise & Workout → Navigation & Controls → Feedback & Social. Each section is a `Card` with a `Text variant="headlineLg"` title, same shell pattern the current page already uses.

## Testing

These are presentational primitives (cva variant classes, no business logic) — consistent with how `button.tsx`/`card.tsx`/`stack.tsx` have no test files today. `Stepper` and `Switch` hold local state and call an `onChange`/`onCheckedChange` callback; each gets one colocated `*.test.ts` (or `.stories.tsx`, matching `button.stories.tsx`/`card.stories.tsx`/`dialog.stories.tsx`/`table.stories.tsx` convention already in the package) verifying the callback fires with the right value on click. No new dependency for tests — existing `vitest` setup (`packages/ui/vitest.config.ts`) covers it.

## Out of scope

- Wiring any of the composed patterns (exercise card, rest timer widget, social feed) into real app pages (exercise library, tracker, progress) — this spec only covers the showcase page and the new library primitives.
- A native/React Native version of `ProgressRing` (would need `react-native-svg`, not currently a dependency) — stays web-only until an RN consumer needs it.
- New color tokens / a tiered `surface-container-*` scale — existing tokens are reused per the mapping table above.
