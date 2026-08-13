'use client';

import { Card } from '@acme/ui';
import { Flame, X } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from '@/lib/i18n/context';

export function StreakBanner({ nextDay }: { nextDay: number }) {
  const { dict } = useLocale();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Card className="glass-panel border-destructive relative flex items-center gap-4 border-l-4 py-3 pl-4">
      <div className="bg-destructive/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <Flame className="text-destructive h-5 w-5" fill="currentColor" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-primary font-bold leading-tight">{dict.streakBanner.title}</p>
        <p className="font-data text-muted-foreground text-xs">{dict.streakBanner.body(nextDay)}</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-primary shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </Card>
  );
}
