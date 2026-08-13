'use client';

import { useLocale } from '@/lib/i18n/context';

const levels = [
  { min: 0, id: 'newbie', armRx: 7, abs: false, dumbbell: false },
  { min: 3, id: 'gettingThere', armRx: 9, abs: false, dumbbell: false },
  { min: 8, id: 'consistent', armRx: 11.5, abs: true, dumbbell: false },
  { min: 16, id: 'absoluteUnit', armRx: 14, abs: true, dumbbell: true },
] as const;

function levelFor(sessionCount: number) {
  let current: (typeof levels)[number] = levels[0];
  for (const level of levels) {
    if (sessionCount >= level.min) current = level;
  }
  return current;
}

export function Mascot({
  sessionCount,
  className = '',
}: {
  sessionCount: number;
  className?: string;
}) {
  const { dict } = useLocale();
  const level = levelFor(sessionCount);
  const copy = dict.mascot[level.id];

  return (
    <div
      className={`border-border bg-card flex items-center gap-4 rounded-lg border p-4 ${className}`}
    >
      <svg viewBox="0 0 100 100" className="text-primary h-16 w-16 shrink-0" aria-hidden="true">
        <ellipse cx="50" cy="60" rx="22" ry="26" fill="currentColor" />
        <circle cx="50" cy="28" r="16" fill="currentColor" />
        <ellipse
          cx="30"
          cy="52"
          rx={level.armRx}
          ry="7"
          fill="currentColor"
          transform="rotate(-20 30 52)"
        />
        <ellipse
          cx="70"
          cy="52"
          rx={level.armRx}
          ry="7"
          fill="currentColor"
          transform="rotate(20 70 52)"
        />
        <ellipse cx="40" cy="85" rx="7" ry="10" fill="currentColor" />
        <ellipse cx="60" cy="85" rx="7" ry="10" fill="currentColor" />
        {level.abs && (
          <>
            <line
              x1="42"
              y1="58"
              x2="58"
              y2="58"
              stroke="var(--color-primary-foreground)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <line
              x1="42"
              y1="65"
              x2="58"
              y2="65"
              stroke="var(--color-primary-foreground)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
          </>
        )}
        {level.dumbbell && (
          <g transform="translate(78 40) rotate(20)">
            <rect x="-2" y="-10" width="4" height="20" rx="1" fill="currentColor" />
            <rect x="-6" y="-13" width="4" height="6" rx="1" fill="currentColor" />
            <rect x="-6" y="7" width="4" height="6" rx="1" fill="currentColor" />
          </g>
        )}
        <circle cx="44" cy="26" r="2" fill="var(--color-primary-foreground)" />
        <circle cx="56" cy="26" r="2" fill="var(--color-primary-foreground)" />
        <path
          d="M44 33 Q50 37 56 33"
          stroke="var(--color-primary-foreground)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="text-sm font-medium">{copy.name}</p>
        <p className="text-muted-foreground text-sm">{copy.tip}</p>
        <p className="text-muted-foreground text-xs">{dict.mascot.trainingsLogged(sessionCount)}</p>
      </div>
    </div>
  );
}
