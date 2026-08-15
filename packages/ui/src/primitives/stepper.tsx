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

export function Stepper({
  value,
  onChange,
  unit,
  label,
  step = 1,
  min = 0,
  className,
}: StepperProps) {
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
