import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const textVariants = cva('', {
  variants: {
    variant: {
      body: 'text-base',
      heading: 'text-2xl font-semibold',
      subheading: 'text-xl font-medium',
      caption: 'text-sm',
      code: 'font-mono text-sm',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      success: 'text-success',
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
});

export type TextProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof textVariants>;

export function Text({ className, variant, tone, ...props }: TextProps) {
  return <span className={cn(textVariants({ variant, tone }), className)} {...props} />;
}
