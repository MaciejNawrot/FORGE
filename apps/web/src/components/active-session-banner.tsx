'use client';

import { Card, Text } from '@acme/ui';
import Link from 'next/link';
import { useActiveSession } from '@/lib/active-session-store';
import { useLocale } from '@/lib/i18n/context';

export function ActiveSessionBanner() {
  const { dict } = useLocale();
  const activeSession = useActiveSession();

  if (!activeSession) return null;

  return (
    <Card className="glass-panel border-primary flex items-center justify-between gap-3 border">
      <Text className="font-medium">{dict.tracker.activeSessionMessage}</Text>
      <Link
        href={`/tracker/${activeSession.sessionId}`}
        className="bg-primary text-primary-foreground font-data rounded-full px-4 py-2 text-xs uppercase transition-colors active:scale-95"
      >
        {dict.tracker.continue}
      </Link>
    </Card>
  );
}
