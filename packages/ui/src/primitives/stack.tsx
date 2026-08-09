import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/**
 * Flexbox layout primitive. React Native only supports flexbox (no grid,
 * no float), so the variants here are deliberately limited to properties
 * that exist on both platforms.
 */
export const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
  },
  defaultVariants: { direction: 'column', gap: 'md', align: 'stretch', justify: 'start' },
});

export type StackProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof stackVariants>;

export function Stack({ className, direction, gap, align, justify, ...props }: StackProps) {
  return (
    <div className={cn(stackVariants({ direction, gap, align, justify }), className)} {...props} />
  );
}
