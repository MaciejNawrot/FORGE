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
