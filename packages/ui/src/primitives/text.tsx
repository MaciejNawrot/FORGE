import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const textVariants = cva('', {
  variants: {
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
