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
