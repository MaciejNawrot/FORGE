# Extended Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/components` to match the Stitch "Extended Component Library (FORGE)" reference mock, adding the primitives it needs to `@acme/ui` along the way.

**Architecture:** New cross-platform primitives (`Badge`, `Chip`, `Switch`, `Stepper`, `SegmentedControl`, `MiniBarGraph`) go in `packages/ui/src/primitives/`, cva-based like the existing `Button`/`Card`; one web-only SVG primitive (`ProgressRing`) goes in `packages/ui/src/web/`. `Text` and `Button` get additive variant extensions. The showcase page composes these plus higher-level patterns (metric card, exercise card, rest timer, social feed snippet) built inline on the page — those aren't promoted to the library since nothing else consumes them yet.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (via `@acme/design-tokens` preset), `class-variance-authority`, `lucide-react`, Storybook (`@storybook/react-vite`), vitest.

## Global Constraints

- No new color tokens — reuse existing `background`/`card`/`border`/`secondary`/`primary`/`warning`/`destructive`/`muted-foreground` per the mapping table in the spec (`docs/superpowers/specs/2026-08-15-extended-component-library-design.md`).
- No new icon dependency — `lucide-react` only, mapped 1:1 from the Stitch mock's Material Symbols names.
- `packages/ui/src/primitives/**` and `packages/ui/src/lib/**` must stay portable: no `document.`/`window.`, no inline `style={{`, no `@radix-ui` imports, no imports from `../web`. This is enforced automatically by `packages/ui/src/primitives/portability.test.ts`, which scans every non-test/non-story `.tsx`/`.ts` file in those two directories — no action needed beyond not violating it.
- `packages/ui` has no React component-render test setup (vitest runs in a plain `node` environment, no jsdom/`@testing-library/react`). Don't add one. Every new primitive gets a colocated `.stories.tsx` instead, matching `button.stories.tsx`/`card.stories.tsx`/`dialog.stories.tsx`/`table.stories.tsx`.
- Follow existing import-order convention: biome's `assist/source/organizeImports` sorts named imports alphabetically — run `pnpm exec biome check --write <file>` after writing/editing if unsure of order, rather than hand-sorting.
- `apps/web`'s Tailwind `content` config already scans `packages/ui/src/**/*.{ts,tsx}` (see `apps/web/tailwind.config.ts`) — new classes used only inside `packages/ui` files are still picked up, no config change needed.

---

## Task 1: `Text` primitive — add typography-scale variants

**Files:**
- Modify: `packages/ui/src/primitives/text.tsx`

**Interfaces:**
- Produces: `TextProps['variant']` gains `'displayXl' | 'headlineLg' | 'headlineLgMobile' | 'dataLabel'` (existing `'body' | 'heading' | 'subheading' | 'caption' | 'code'` untouched).

- [ ] **Step 1: Add the new variants to `textVariants`**

Edit `packages/ui/src/primitives/text.tsx`. Current `variants.variant` object:

```ts
variant: {
  body: 'text-base',
  heading: 'text-2xl font-semibold tracking-tight',
  subheading: 'text-xl font-medium tracking-tight',
  caption: 'text-sm',
  code: 'font-mono text-sm',
},
```

Replace with:

```ts
variant: {
  body: 'text-base',
  heading: 'text-2xl font-semibold tracking-tight',
  subheading: 'text-xl font-medium tracking-tight',
  caption: 'text-sm',
  code: 'font-mono text-sm',
  displayXl: 'text-[64px] leading-[1.1] tracking-[0.02em] font-normal',
  headlineLg: 'text-[32px] leading-[1.2] tracking-[0.02em] font-normal',
  headlineLgMobile: 'text-[28px] leading-[1.2] font-normal',
  dataLabel: 'font-data text-sm font-medium uppercase tracking-wide',
},
```

`displayXl`/`headlineLg`/`headlineLgMobile` set size only (no font-family) — matching the codebase's existing convention where call sites pair `variant="heading"` with an explicit `className="font-display ..."` (see `apps/web/src/app/settings/page.tsx:11`, `apps/web/src/app/page.tsx:24`). `dataLabel` bakes in `font-data` (the app's JetBrains Mono utility class from `globals.css`) directly, matching how the existing `code` variant already bakes in its own font-family.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/text.tsx`
Expected: no errors. If import/formatting issues, run `pnpm exec biome check --write packages/ui/src/primitives/text.tsx`.

- [ ] **Step 4: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS (the new variant strings contain no `document.`/`window.`/`style={{`/`@radix-ui`/`../web` patterns).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/primitives/text.tsx
git commit -m "feat(ui): add displayXl/headlineLg/headlineLgMobile/dataLabel Text variants"
```

---

## Task 2: `Button` primitive — add `icon` size

**Files:**
- Modify: `packages/ui/src/primitives/button.tsx`

**Interfaces:**
- Produces: `ButtonProps['size']` gains `'icon'` (existing `'sm' | 'md' | 'lg'` untouched).

- [ ] **Step 1: Add the `icon` size variant**

Edit `packages/ui/src/primitives/button.tsx`. Current `variants.size` object:

```ts
size: {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
},
```

Replace with:

```ts
size: {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
  icon: 'h-12 w-12 rounded-full p-0',
},
```

The base class list already includes `rounded-md`; because `Button`'s render (`cn(buttonVariants({ variant, size }), className)`) runs the combined string through `tailwind-merge`, and `icon`'s `rounded-full` is appended after the base's `rounded-md` in the generated string, `tailwind-merge` resolves the conflict in favor of `rounded-full` — no base-class change needed.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/button.tsx`
Expected: no errors.

- [ ] **Step 4: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/primitives/button.tsx
git commit -m "feat(ui): add icon size variant to Button"
```

---

## Task 3: `Badge` primitive

**Files:**
- Create: `packages/ui/src/primitives/badge.tsx`
- Create: `packages/ui/src/primitives/badge.stories.tsx`
- Modify: `packages/ui/src/primitives/index.ts`

**Interfaces:**
- Consumes: `cn` from `../lib/cn` (existing).
- Produces: `Badge` component, `badgeVariants` cva function, `BadgeProps` type. `Badge` renders a `<span>`; `tone: 'primary' | 'warning' | 'destructive' | 'neutral' | 'muted'` (default `'neutral'`). Accepts arbitrary children (so callers can pass an icon + text, e.g. `<Badge tone="primary"><Trophy className="h-3 w-3" /> PR Alert</Badge>`).

- [ ] **Step 1: Create the component**

Create `packages/ui/src/primitives/badge.tsx`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 font-data text-xs uppercase tracking-wide',
  {
    variants: {
      tone: {
        primary: 'bg-primary/20 text-primary border-primary/30',
        warning: 'bg-warning/20 text-warning border-warning/30',
        destructive: 'bg-destructive/20 text-destructive border-destructive/30',
        neutral: 'bg-secondary text-foreground border-border',
        muted: 'bg-card text-muted-foreground border-border',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
```

- [ ] **Step 2: Create the story**

Create `packages/ui/src/primitives/badge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge tone="primary">PR Alert</Badge>
      <Badge tone="warning">Recovery Mode</Badge>
      <Badge tone="destructive">High Intensity</Badge>
      <Badge tone="neutral">Completed</Badge>
      <Badge tone="muted">Scheduled</Badge>
    </div>
  ),
};
```

- [ ] **Step 3: Export from the primitives barrel**

Edit `packages/ui/src/primitives/index.ts`. Current content:

```ts
export * from './button';
export * from './card';
export * from './input';
export * from './stack';
export * from './text';
```

Replace with:

```ts
export * from './badge';
export * from './button';
export * from './card';
export * from './input';
export * from './stack';
export * from './text';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/badge.tsx packages/ui/src/primitives/badge.stories.tsx packages/ui/src/primitives/index.ts`
Expected: no errors (run with `--write` if import order needs fixing).

- [ ] **Step 6: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/primitives/badge.tsx packages/ui/src/primitives/badge.stories.tsx packages/ui/src/primitives/index.ts
git commit -m "feat(ui): add Badge primitive"
```

---

## Task 4: `Chip` primitive

**Files:**
- Create: `packages/ui/src/primitives/chip.tsx`
- Create: `packages/ui/src/primitives/chip.stories.tsx`
- Modify: `packages/ui/src/primitives/index.ts`

**Interfaces:**
- Consumes: `cn` from `../lib/cn`.
- Produces: `Chip` component, `chipVariants` cva function, `ChipProps` type. Renders a `<button type="button">`. `selected?: boolean` (default `false`). Covers both filter chips (interactive, `onClick` toggles `selected`) and static exercise-tag chips (rendered with `selected` omitted, `tabIndex={-1}`, no `onClick`).

- [ ] **Step 1: Create the component**

Create `packages/ui/src/primitives/chip.tsx`:

```tsx
'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const chipVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 font-data text-sm transition-colors',
  {
    variants: {
      selected: {
        true: 'border-primary bg-primary/10 text-primary',
        false: 'border-border bg-card text-muted-foreground hover:border-muted-foreground',
      },
    },
    defaultVariants: { selected: false },
  },
);

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof chipVariants>;

export function Chip({ className, selected, type = 'button', ...props }: ChipProps) {
  return <button type={type} className={cn(chipVariants({ selected }), className)} {...props} />;
}
```

- [ ] **Step 2: Create the story**

Create `packages/ui/src/primitives/chip.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Chip } from './chip';

const meta = {
  title: 'Primitives/Chip',
  component: Chip,
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

const FILTERS = ['Full Body', 'Push', 'Pull', 'Legs', 'Core'];

export const FilterChips: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState(FILTERS[0]);
      return (
        <div className="flex flex-wrap gap-3">
          {FILTERS.map((filter) => (
            <Chip key={filter} selected={filter === active} onClick={() => setActive(filter)}>
              {filter}
            </Chip>
          ))}
        </div>
      );
    }
    return <Demo />;
  },
};

export const StaticTag: Story = {
  render: () => (
    <Chip tabIndex={-1} className="cursor-default px-2 py-1 text-xs">
      Chest
    </Chip>
  ),
};
```

- [ ] **Step 3: Export from the primitives barrel**

Edit `packages/ui/src/primitives/index.ts`, insert alphabetically between `badge` and `input`:

```ts
export * from './badge';
export * from './button';
export * from './card';
export * from './chip';
export * from './input';
export * from './stack';
export * from './text';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/chip.tsx packages/ui/src/primitives/chip.stories.tsx packages/ui/src/primitives/index.ts`
Expected: no errors.

- [ ] **Step 6: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/primitives/chip.tsx packages/ui/src/primitives/chip.stories.tsx packages/ui/src/primitives/index.ts
git commit -m "feat(ui): add Chip primitive"
```

---

## Task 5: `Switch` primitive

**Files:**
- Create: `packages/ui/src/primitives/switch.tsx`
- Create: `packages/ui/src/primitives/switch.stories.tsx`
- Modify: `packages/ui/src/primitives/index.ts`

**Interfaces:**
- Consumes: `cn` from `../lib/cn`.
- Produces: `Switch` component, `SwitchProps` type: `Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & { onCheckedChange?: (checked: boolean) => void }`. Supports both controlled (`checked` + `onCheckedChange`) and uncontrolled (`defaultChecked`) usage via native `<input type="checkbox">` semantics.

- [ ] **Step 1: Create the component**

Create `packages/ui/src/primitives/switch.tsx`:

```tsx
'use client';

import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ className, onCheckedChange, ...props }: SwitchProps) {
  return (
    <span className={cn('relative inline-flex h-8 w-14 shrink-0 items-center', className)}>
      <input
        type="checkbox"
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
        {...props}
      />
      <span className="border-border bg-secondary pointer-events-none absolute inset-0 rounded-full border" />
      <span className="bg-muted-foreground peer-checked:bg-primary pointer-events-none absolute left-1 h-6 w-6 rounded-full transition-transform peer-checked:translate-x-6" />
    </span>
  );
}
```

- [ ] **Step 2: Create the story**

Create `packages/ui/src/primitives/switch.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from './switch';

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Controlled: Story = {
  render: () => {
    function Demo() {
      const [checked, setChecked] = useState(true);
      return (
        <label className="flex items-center gap-3">
          <Switch checked={checked} onCheckedChange={setChecked} />
          <span>Warmup Sets</span>
        </label>
      );
    }
    return <Demo />;
  },
};

export const Uncontrolled: Story = {
  render: () => (
    <label className="flex items-center gap-3">
      <Switch defaultChecked={false} />
      <span>Auto-Rest</span>
    </label>
  ),
};
```

- [ ] **Step 3: Export from the primitives barrel**

Edit `packages/ui/src/primitives/index.ts`, insert alphabetically after `stack`:

```ts
export * from './badge';
export * from './button';
export * from './card';
export * from './chip';
export * from './input';
export * from './stack';
export * from './switch';
export * from './text';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/switch.tsx packages/ui/src/primitives/switch.stories.tsx packages/ui/src/primitives/index.ts`
Expected: no errors.

- [ ] **Step 6: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/primitives/switch.tsx packages/ui/src/primitives/switch.stories.tsx packages/ui/src/primitives/index.ts
git commit -m "feat(ui): add Switch primitive"
```

---

## Task 6: `Stepper` primitive (adds `lucide-react` dependency to `@acme/ui`)

**Files:**
- Create: `packages/ui/src/primitives/stepper.tsx`
- Create: `packages/ui/src/primitives/stepper.stories.tsx`
- Modify: `packages/ui/src/primitives/index.ts`
- Modify: `packages/ui/package.json`

**Interfaces:**
- Consumes: `cn` from `../lib/cn`; `Text` from `./text` (uses the `headlineLgMobile` and `dataLabel` variants added in Task 1); `Minus`/`Plus` from `lucide-react`.
- Produces: `Stepper` component, `StepperProps` type: `{ value: number; onChange: (value: number) => void; unit: string; label?: string; step?: number; min?: number; className?: string }`.

- [ ] **Step 1: Add `lucide-react` as a dependency of `@acme/ui`**

`packages/ui` doesn't currently depend on `lucide-react` (only `apps/web` does, pinned directly since it isn't in the pnpm catalog). Edit `packages/ui/package.json`, in `dependencies` add it alongside the existing entries, matching the same version `apps/web/package.json` pins:

```json
"dependencies": {
  "@radix-ui/react-dialog": "catalog:",
  "class-variance-authority": "catalog:",
  "clsx": "catalog:",
  "lucide-react": "^0.545.0",
  "tailwind-merge": "catalog:"
},
```

Then run `pnpm install` from the repo root so the workspace symlink is created.

- [ ] **Step 2: Create the component**

Create `packages/ui/src/primitives/stepper.tsx`:

```tsx
'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '../lib/cn';
import { Text } from './text';

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  label?: string;
  step?: number;
  min?: number;
  className?: string;
};

export function Stepper({ value, onChange, unit, label, step = 1, min = 0, className }: StepperProps) {
  return (
    <div className={cn('bg-secondary flex items-center justify-between rounded-xl p-2', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="text-primary hover:bg-card flex h-12 w-12 items-center justify-center rounded-lg active:scale-95"
        aria-label={label ? `Decrease ${label}` : 'Decrease'}
      >
        <Minus className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex flex-col items-center">
        <Text variant="headlineLgMobile" className="font-display text-foreground">
          {value}
        </Text>
        <Text variant="dataLabel" className="text-primary">
          {unit}
        </Text>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + step)}
        className="text-primary hover:bg-card flex h-12 w-12 items-center justify-center rounded-lg active:scale-95"
        aria-label={label ? `Increase ${label}` : 'Increase'}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create the story**

Create `packages/ui/src/primitives/stepper.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Stepper } from './stepper';

const meta = {
  title: 'Primitives/Stepper',
  component: Stepper,
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Weight: Story = {
  render: () => {
    function Demo() {
      const [weight, setWeight] = useState(225);
      return <Stepper value={weight} onChange={setWeight} unit="LBS" label="weight" step={5} />;
    }
    return <Demo />;
  },
};

export const Reps: Story = {
  render: () => {
    function Demo() {
      const [reps, setReps] = useState(8);
      return <Stepper value={reps} onChange={setReps} unit="REPS" label="reps" />;
    }
    return <Demo />;
  },
};
```

- [ ] **Step 4: Export from the primitives barrel**

Edit `packages/ui/src/primitives/index.ts`, insert alphabetically after `stack`, before `switch`:

```ts
export * from './badge';
export * from './button';
export * from './card';
export * from './chip';
export * from './input';
export * from './stack';
export * from './stepper';
export * from './switch';
export * from './text';
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 6: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/stepper.tsx packages/ui/src/primitives/stepper.stories.tsx packages/ui/src/primitives/index.ts packages/ui/package.json`
Expected: no errors.

- [ ] **Step 7: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/primitives/stepper.tsx packages/ui/src/primitives/stepper.stories.tsx packages/ui/src/primitives/index.ts packages/ui/package.json pnpm-lock.yaml
git commit -m "feat(ui): add Stepper primitive"
```

---

## Task 7: `SegmentedControl` primitive

**Files:**
- Create: `packages/ui/src/primitives/segmented-control.tsx`
- Create: `packages/ui/src/primitives/segmented-control.stories.tsx`
- Modify: `packages/ui/src/primitives/index.ts`

**Interfaces:**
- Consumes: `cn` from `../lib/cn`.
- Produces: `SegmentedControl` component, `SegmentedControlOption` type (`{ value: string; label: string }`), `SegmentedControlProps` type: `{ options: SegmentedControlOption[]; value: string; onChange: (value: string) => void; className?: string }`.

- [ ] **Step 1: Create the component**

Create `packages/ui/src/primitives/segmented-control.tsx`:

```tsx
'use client';

import { cn } from '../lib/cn';

export type SegmentedControlOption = { value: string; label: string };

export type SegmentedControlProps = {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('bg-secondary flex gap-1 rounded-xl p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'font-display flex-1 rounded-lg py-2 text-sm uppercase tracking-wide transition-all',
            option.value === value
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-primary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the story**

Create `packages/ui/src/primitives/segmented-control.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegmentedControl } from './segmented-control';

const meta = {
  title: 'Primitives/SegmentedControl',
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    function Demo() {
      const [tab, setTab] = useState('all');
      return (
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'All' },
            { value: 'strength', label: 'Strength' },
            { value: 'cardio', label: 'Cardio' },
          ]}
        />
      );
    }
    return <Demo />;
  },
};
```

- [ ] **Step 3: Export from the primitives barrel**

Edit `packages/ui/src/primitives/index.ts`, insert alphabetically after `input`:

```ts
export * from './badge';
export * from './button';
export * from './card';
export * from './chip';
export * from './input';
export * from './segmented-control';
export * from './stack';
export * from './stepper';
export * from './switch';
export * from './text';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/segmented-control.tsx packages/ui/src/primitives/segmented-control.stories.tsx packages/ui/src/primitives/index.ts`
Expected: no errors.

- [ ] **Step 6: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/primitives/segmented-control.tsx packages/ui/src/primitives/segmented-control.stories.tsx packages/ui/src/primitives/index.ts
git commit -m "feat(ui): add SegmentedControl primitive"
```

---

## Task 8: `MiniBarGraph` primitive

**Files:**
- Create: `packages/ui/src/primitives/bar-graph.tsx`
- Create: `packages/ui/src/primitives/bar-graph.stories.tsx`
- Modify: `packages/ui/src/primitives/index.ts`

**Interfaces:**
- Consumes: `cn` from `../lib/cn`.
- Produces: `MiniBarGraph` component, `MiniBarGraphProps` type: `{ values: number[]; highlightIndex?: number; className?: string }`. `values` are 0–100.

Dynamic per-bar heights can't use an inline `style={{ height }}` (forbidden by the portability contract in `primitives/`) and can't use a runtime-constructed arbitrary Tailwind class like `` `h-[${n}%]` `` (Tailwind's build-time scanner only picks up class strings that appear literally in source, not ones assembled at runtime). Instead, round each value to the nearest 5 and look it up in a literal, fully-enumerated class map — every possible class string is physically present in the file for Tailwind to find.

- [ ] **Step 1: Create the component**

Create `packages/ui/src/primitives/bar-graph.tsx`:

```tsx
import { cn } from '../lib/cn';

const HEIGHT_CLASSES = {
  0: 'h-[0%]',
  5: 'h-[5%]',
  10: 'h-[10%]',
  15: 'h-[15%]',
  20: 'h-[20%]',
  25: 'h-[25%]',
  30: 'h-[30%]',
  35: 'h-[35%]',
  40: 'h-[40%]',
  45: 'h-[45%]',
  50: 'h-[50%]',
  55: 'h-[55%]',
  60: 'h-[60%]',
  65: 'h-[65%]',
  70: 'h-[70%]',
  75: 'h-[75%]',
  80: 'h-[80%]',
  85: 'h-[85%]',
  90: 'h-[90%]',
  95: 'h-[95%]',
  100: 'h-[100%]',
} as const;

function heightClass(value: number): string {
  const clamped = Math.min(100, Math.max(0, value));
  const rounded = (Math.round(clamped / 5) * 5) as keyof typeof HEIGHT_CLASSES;
  return HEIGHT_CLASSES[rounded];
}

export type MiniBarGraphProps = {
  values: number[];
  highlightIndex?: number;
  className?: string;
};

export function MiniBarGraph({ values, highlightIndex, className }: MiniBarGraphProps) {
  return (
    <div className={cn('flex h-32 items-end justify-between gap-2', className)}>
      {values.map((value, index) => (
        <div
          key={index}
          className={cn(
            'w-full rounded-t-sm transition-colors',
            heightClass(value),
            index === highlightIndex ? 'bg-primary glow-primary' : 'bg-secondary',
          )}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the story**

Create `packages/ui/src/primitives/bar-graph.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiniBarGraph } from './bar-graph';

const meta = {
  title: 'Primitives/MiniBarGraph',
  component: MiniBarGraph,
} satisfies Meta<typeof MiniBarGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <MiniBarGraph values={[40, 60, 30, 80, 100, 50, 70]} highlightIndex={4} />,
};
```

- [ ] **Step 3: Export from the primitives barrel**

Edit `packages/ui/src/primitives/index.ts`, insert `bar-graph` first alphabetically (before `badge`):

```ts
export * from './badge';
export * from './bar-graph';
export * from './button';
export * from './card';
export * from './chip';
export * from './input';
export * from './segmented-control';
export * from './stack';
export * from './stepper';
export * from './switch';
export * from './text';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `pnpm exec biome check packages/ui/src/primitives/bar-graph.tsx packages/ui/src/primitives/bar-graph.stories.tsx packages/ui/src/primitives/index.ts`
Expected: no errors.

- [ ] **Step 6: Run the portability test**

Run: `pnpm --filter @acme/ui test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/primitives/bar-graph.tsx packages/ui/src/primitives/bar-graph.stories.tsx packages/ui/src/primitives/index.ts
git commit -m "feat(ui): add MiniBarGraph primitive"
```

---

## Task 9: `ProgressRing` web component

**Files:**
- Create: `packages/ui/src/web/progress-ring.tsx`
- Create: `packages/ui/src/web/progress-ring.stories.tsx`
- Modify: `packages/ui/src/web/index.ts`

**Interfaces:**
- Consumes: `cn` from `../lib/cn`.
- Produces: `ProgressRing` component, `ProgressRingProps` type: `{ percent: number; size?: number; tone?: 'primary' | 'warning'; glow?: boolean; className?: string; children?: React.ReactNode }`. `percent` is 0–100.

This is web-only (SVG + inline `style` for dynamic pixel sizing) — it lives in `packages/ui/src/web/`, which is not covered by the `primitives/` portability contract, matching how `dialog.tsx`/`table.tsx` already work.

- [ ] **Step 1: Create the component**

Create `packages/ui/src/web/progress-ring.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ProgressRingProps = {
  percent: number;
  size?: number;
  tone?: 'primary' | 'warning';
  glow?: boolean;
  className?: string;
  children?: ReactNode;
};

const TONE_STROKE: Record<NonNullable<ProgressRingProps['tone']>, string> = {
  primary: 'text-primary',
  warning: 'text-warning',
};

export function ProgressRing({
  percent,
  size = 64,
  tone = 'primary',
  glow = false,
  className,
  children,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-secondary"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className={cn(TONE_STROKE[tone], glow && 'drop-shadow-[0_0_8px_currentColor]')}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeDasharray={`${clamped}, 100`}
          strokeWidth="4"
        />
      </svg>
      {children && <div className="absolute">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create the story**

Create `packages/ui/src/web/progress-ring.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressRing } from './progress-ring';

const meta = {
  title: 'Web/ProgressRing',
  component: ProgressRing,
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WorkoutProgress: Story = {
  render: () => (
    <ProgressRing percent={66} glow>
      <span className="text-primary text-sm">66%</span>
    </ProgressRing>
  ),
};

export const RestTimer: Story = {
  render: () => (
    <ProgressRing percent={45} size={128} tone="warning" glow>
      <span className="text-primary text-lg">0:45</span>
    </ProgressRing>
  ),
};
```

- [ ] **Step 3: Export from the web barrel**

Edit `packages/ui/src/web/index.ts`. Current content:

```ts
export * from './dialog';
export * from './table';
```

Replace with:

```ts
export * from './dialog';
export * from './progress-ring';
export * from './table';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @acme/ui typecheck`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `pnpm exec biome check packages/ui/src/web/progress-ring.tsx packages/ui/src/web/progress-ring.stories.tsx packages/ui/src/web/index.ts`
Expected: no errors.

- [ ] **Step 6: Run the full package test suite**

Run: `pnpm --filter @acme/ui test`
Expected: PASS (the portability test doesn't scan `web/`, so this file's inline `style` is fine).

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/web/progress-ring.tsx packages/ui/src/web/progress-ring.stories.tsx packages/ui/src/web/index.ts
git commit -m "feat(ui): add ProgressRing web component"
```

---

## Task 10: Rewrite `/components` page to match the Stitch reference

**Files:**
- Modify: `apps/web/src/app/components/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `Badge`, `Button`, `Card`, `Chip`, `Input`, `MiniBarGraph`, `SegmentedControl`, `Stack`, `Stepper`, `Switch`, `Text` from `@acme/ui`; `ProgressRing` from `@acme/ui/web`; icons from `lucide-react` (already a dependency of `apps/web`).

- [ ] **Step 1: Replace the page**

Replace the full contents of `apps/web/src/app/components/page.tsx` with:

```tsx
'use client';

import {
  Badge,
  Button,
  Card,
  Chip,
  Input,
  MiniBarGraph,
  SegmentedControl,
  Stack,
  Stepper,
  Switch,
  Text,
} from '@acme/ui';
import { ProgressRing } from '@acme/ui/web';
import {
  AlertTriangle,
  BatteryCharging,
  Calendar,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Timer,
  Trash2,
  Trophy,
  User,
} from 'lucide-react';
import { useState } from 'react';

const FILTERS = ['Full Body', 'Push', 'Pull', 'Legs', 'Core'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="glass-panel flex flex-col gap-4">
      <Text variant="headlineLg" className="font-display text-primary uppercase">
        {title}
      </Text>
      <Stack gap="lg">{children}</Stack>
    </Card>
  );
}

function Sample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <Text variant="dataLabel" tone="muted">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export default function ComponentsPage() {
  const [activeFilter, setActiveFilter] = useState<string>(FILTERS[0]);
  const [tab, setTab] = useState('all');
  const [warmupSets, setWarmupSets] = useState(true);
  const [autoRest, setAutoRest] = useState(false);
  const [weight, setWeight] = useState(225);
  const [reps, setReps] = useState(8);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          Extended Component Library
        </Text>

        <Section title="Typography">
          <Sample label="Display XL (Anton)">
            <Text variant="displayXl" className="font-display text-primary">
              CRUSH LIMITS
            </Text>
          </Sample>
          <Sample label="Headline LG (Anton)">
            <Text variant="headlineLg" className="font-display text-primary">
              WORKOUT SUMMARY
            </Text>
          </Sample>
          <Sample label="Headline LG Mobile (Anton)">
            <Text variant="headlineLgMobile" className="font-display text-primary">
              CURRENT SET
            </Text>
          </Sample>
          <Sample label="Body MD (Inter)">
            <Text variant="body">
              Maintain tension throughout the eccentric phase of the movement.
            </Text>
          </Sample>
          <Sample label="Data Label (JetBrains Mono)">
            <Text variant="dataLabel" className="text-primary">
              RPE 8.5 / 225 LBS / 5 REPS
            </Text>
          </Sample>
        </Section>

        <Section title="Action Buttons">
          <Sample label="Primary Solid">
            <Button size="lg" className="font-display glow-primary uppercase tracking-wide">
              Start Workout
            </Button>
          </Sample>
          <Sample label="Secondary Ghost">
            <Button variant="outline" size="lg" className="font-display uppercase tracking-wide">
              Add Exercise
            </Button>
          </Sample>
          <Sample label="Icon Actions">
            <Stack direction="row" gap="sm">
              <Button size="icon" variant="secondary">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button size="icon" variant="outline">
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button size="icon" variant="destructive" className="bg-destructive/20 text-destructive">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Stack>
          </Sample>
        </Section>

        <Section title="Data & Metrics">
          <Sample label="Metric Cards">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Heart, label: 'Avg HR', value: '142', unit: 'bpm' },
                { icon: Flame, label: 'Calories', value: '845', unit: 'kcal' },
                { icon: Dumbbell, label: 'Volume', value: '12.4', unit: 'k' },
                { icon: Timer, label: 'Duration', value: '1:15', unit: 'hr' },
              ].map(({ icon: Icon, label, value, unit }) => (
                <div key={label} className="bg-card border-border rounded-2xl border p-4">
                  <div className="text-muted-foreground mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <Text variant="dataLabel">{label}</Text>
                  </div>
                  <Text variant="headlineLgMobile" className="font-display text-primary">
                    {value} <span className="text-muted-foreground text-sm font-normal">{unit}</span>
                  </Text>
                </div>
              ))}
            </div>
          </Sample>
          <Sample label="Workout Progress Card">
            <div className="bg-card border-border rounded-2xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <Text variant="headlineLgMobile" className="font-display text-primary">
                    Upper Body Power
                  </Text>
                  <Text variant="dataLabel" tone="muted">
                    4 of 6 Exercises Completed
                  </Text>
                </div>
                <ProgressRing percent={66} glow>
                  <Text variant="dataLabel" className="text-primary">
                    66%
                  </Text>
                </ProgressRing>
              </div>
              <div className="bg-secondary h-2 w-full rounded-full">
                <div className="bg-primary glow-primary h-2 w-2/3 rounded-full" />
              </div>
            </div>
          </Sample>
          <Sample label="Data Visualization">
            <MiniBarGraph values={[40, 60, 30, 80, 100, 50, 70]} highlightIndex={4} />
          </Sample>
        </Section>

        <Section title="Exercise & Workout">
          <Sample label="Exercise Card">
            <div className="bg-card border-border hover:border-primary/50 flex flex-col gap-4 rounded-2xl border p-4 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-secondary flex h-12 w-12 items-center justify-center rounded-full">
                    <Dumbbell className="text-primary h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <Text className="font-semibold">Barbell Bench Press</Text>
                    <Text variant="dataLabel" tone="muted">
                      Bar to mid-chest, elbows ~45°.
                    </Text>
                  </div>
                </div>
                <MoreHorizontal className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              </div>
              <Stack direction="row" gap="sm">
                {['Chest', 'Triceps', 'Shoulders'].map((tag) => (
                  <Chip key={tag} tabIndex={-1} className="cursor-default px-2 py-1 text-xs">
                    {tag}
                  </Chip>
                ))}
              </Stack>
              <div className="border-border flex items-center justify-between border-t pt-3">
                <Text variant="dataLabel" className="text-primary">
                  3 SETS × 8-10 REPS
                </Text>
                <Text variant="dataLabel" tone="muted">
                  Last: 225 lbs
                </Text>
              </div>
            </div>
          </Sample>
          <Sample label="Rest Timer Widget">
            <div className="bg-card border-border flex flex-col items-center rounded-2xl border p-6">
              <ProgressRing percent={45} size={128} tone="warning" glow>
                <div className="flex flex-col items-center">
                  <Text variant="headlineLgMobile" className="font-display text-primary">
                    0:45
                  </Text>
                  <Text variant="dataLabel" tone="muted">
                    REST
                  </Text>
                </div>
              </ProgressRing>
              <Stack direction="row" gap="md" className="mt-4">
                <Button variant="secondary" className="font-display rounded-full">
                  +15s
                </Button>
                <Button variant="secondary" className="font-display text-primary rounded-full">
                  SKIP
                </Button>
              </Stack>
            </div>
          </Sample>
          <Sample label="Interactive Stepper">
            <Stack gap="md">
              <Stepper value={weight} onChange={setWeight} unit="LBS" label="weight" step={5} />
              <Stepper value={reps} onChange={setReps} unit="REPS" label="reps" />
            </Stack>
          </Sample>
        </Section>

        <Section title="Navigation & Controls">
          <Sample label="Tab Bar">
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'All' },
                { value: 'strength', label: 'Strength' },
                { value: 'cardio', label: 'Cardio' },
              ]}
            />
          </Sample>
          <Sample label="Filter Chips">
            <Stack direction="row" gap="sm" className="flex-wrap">
              {FILTERS.map((filter) => (
                <Chip
                  key={filter}
                  selected={filter === activeFilter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </Chip>
              ))}
            </Stack>
          </Sample>
          <Sample label="Toggle Switch">
            <Stack gap="sm">
              <label className="flex items-center gap-3">
                <Switch checked={warmupSets} onCheckedChange={setWarmupSets} />
                <Text variant="dataLabel">Warmup Sets</Text>
              </label>
              <label className="flex items-center gap-3">
                <Switch checked={autoRest} onCheckedChange={setAutoRest} />
                <Text variant="dataLabel" tone="muted">
                  Auto-Rest
                </Text>
              </label>
            </Stack>
          </Sample>
          <Sample label="Search Input">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input placeholder="Search exercises…" className="pl-11" />
            </div>
          </Sample>
        </Section>

        <Section title="Feedback & Social">
          <Sample label="Status Badges">
            <Stack direction="row" gap="sm" className="flex-wrap">
              <Badge tone="primary">
                <Trophy className="h-3 w-3" aria-hidden="true" /> PR Alert
              </Badge>
              <Badge tone="warning">
                <BatteryCharging className="h-3 w-3" aria-hidden="true" /> Recovery Mode
              </Badge>
              <Badge tone="destructive">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> High Intensity
              </Badge>
              <Badge tone="neutral">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Completed
              </Badge>
              <Badge tone="muted">
                <Calendar className="h-3 w-3" aria-hidden="true" /> Scheduled
              </Badge>
            </Stack>
          </Sample>
          <Sample label="Social Feed Snippet">
            <div className="bg-card border-border rounded-2xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-secondary flex h-10 w-10 items-center justify-center rounded-full">
                    <User className="text-muted-foreground h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <Text variant="dataLabel" className="font-bold">
                      ALEX M.
                    </Text>
                    <Text variant="caption" tone="muted">
                      2 hours ago
                    </Text>
                  </div>
                </div>
                <MoreHorizontal className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              </div>
              <Text className="mb-4 text-sm">
                Crushed the new PR program! The volume was insane but pushed through. 🚀
              </Text>
              <div className="bg-background border-border mb-4 flex items-center gap-4 rounded-xl border p-3">
                <div className="bg-secondary flex h-16 w-16 shrink-0 items-center justify-center rounded-lg">
                  <Dumbbell className="text-primary h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <Text
                    variant="headlineLgMobile"
                    className="font-display text-primary text-xl leading-tight"
                  >
                    Lower Body Destruction
                  </Text>
                  <Text variant="dataLabel" className="text-primary mt-1">
                    1h 45m • 14,200 LBS
                  </Text>
                </div>
              </div>
              <div className="border-border flex items-center gap-6 border-t pt-3">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  <Text variant="dataLabel">24</Text>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <Text variant="dataLabel">5</Text>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary ml-auto flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </Sample>
        </Section>
      </Stack>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck the web app**

Run: `pnpm --filter @acme/web typecheck`
Expected: no errors. (If `Text`/`Chip`/etc. aren't found, re-check Tasks 1–9 committed their `index.ts` export changes.)

- [ ] **Step 3: Lint**

Run: `pnpm exec biome check apps/web/src/app/components/page.tsx`
Expected: no errors; if import order flags, run with `--write`.

- [ ] **Step 4: Visual check in a running dev server**

Start (or reuse) the dev server: `pnpm --filter @acme/web dev` (if port 3000 is already in use by another dev server, that's fine — reuse it rather than starting a second one).

Using the claude-in-chrome browser tools (or manually), navigate to `http://localhost:3000/components` and verify:
- All six sections render (Typography, Action Buttons, Data & Metrics, Exercise & Workout, Navigation & Controls, Feedback & Social).
- The Interactive Stepper's +/- buttons change the displayed value.
- The Filter Chips row highlights the clicked chip.
- Both Toggle Switches visibly flip on click.
- The Tab Bar (SegmentedControl) highlights the clicked segment.
- No console errors (check via `read_console_messages` if using claude-in-chrome).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/components/page.tsx
git commit -m "feat(web): rewrite /components to match the Stitch Extended Component Library mock"
```

---

## Self-Review Notes

- **Spec coverage:** Typography ✅ (Task 1 + page Typography section), Action Buttons ✅ (Task 2 + page section), Data & Metrics (metric cards, workout progress card, mini bar graph) ✅ (Tasks 8–9 + page section), Exercise & Workout (exercise card, rest timer, stepper) ✅ (Tasks 6, 9 + page section), Navigation & Controls (tab bar, filter chips, toggle, search) ✅ (Tasks 4, 5, 7 + page section), Feedback & Social (badges, social feed) ✅ (Task 3 + page section). Color/icon mapping tables from the spec are followed throughout Task 10's code. Out-of-scope items from the spec (RN `ProgressRing`, new color tokens, wiring composed patterns into real feature pages) are correctly not addressed by any task.
- **Placeholder scan:** No TBD/TODO; every step has literal code, not a description of code.
- **Type consistency:** `ProgressRingProps['tone']`, `SegmentedControlOption`, `ChipProps['selected']`, `StepperProps`, `SwitchProps['onCheckedChange']` are defined once (Tasks 3–9) and consumed with matching shapes in Task 10 — checked against the final page code above.
