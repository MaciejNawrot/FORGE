import { cn } from '../lib/cn';

const HEIGHT_CLASSES = {
  0: 'h-[0%]',
  5: 'h-[5%]',
  10: 'h-[10%]',
  15: 'h-[15%]',
  20: 'h-[20%]',
  25: 'h-[25%]',
  30: 'h-[30%]',
  35: 'h-[35%]',
  40: 'h-[40%]',
  45: 'h-[45%]',
  50: 'h-[50%]',
  55: 'h-[55%]',
  60: 'h-[60%]',
  65: 'h-[65%]',
  70: 'h-[70%]',
  75: 'h-[75%]',
  80: 'h-[80%]',
  85: 'h-[85%]',
  90: 'h-[90%]',
  95: 'h-[95%]',
  100: 'h-[100%]',
} as const;

function heightClass(value: number): string {
  const clamped = Math.min(100, Math.max(0, value));
  const rounded = (Math.round(clamped / 5) * 5) as keyof typeof HEIGHT_CLASSES;
  return HEIGHT_CLASSES[rounded];
}

export type MiniBarGraphProps = {
  values: number[];
  highlightIndex?: number;
  className?: string;
};

export function MiniBarGraph({ values, highlightIndex, className }: MiniBarGraphProps) {
  return (
    <div className={cn('flex h-32 items-end justify-between gap-2', className)}>
      {values.map((value, index) => (
        <div
          key={index}
          className={cn(
            'w-full rounded-t-sm transition-colors',
            heightClass(value),
            index === highlightIndex ? 'bg-primary glow-primary' : 'bg-secondary',
          )}
        />
      ))}
    </div>
  );
}
