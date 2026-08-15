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
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
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
