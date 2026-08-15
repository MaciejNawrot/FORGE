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
