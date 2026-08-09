'use client';

import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 rounded-md border px-3 text-base focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
