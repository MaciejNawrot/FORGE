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
