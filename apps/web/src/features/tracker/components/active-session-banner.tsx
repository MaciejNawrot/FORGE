'use client';

import { Button, Card, Text } from '@acme/ui';
import Link from 'next/link';
import { useActiveSession } from '@/shared/hooks';
import { useLocale } from '@/shared/i18n/context';

export function ActiveSessionBanner() {
  const { dict } = useLocale();
  const activeSession = useActiveSession();

  if (!activeSession) return null;

  return (
    <Card className="glass-panel border-primary flex items-center justify-between gap-3 border">
      <Text className="font-medium">{dict.tracker.activeSessionMessage}</Text>
      <Link href={`/tracker/${activeSession.sessionId}`}>
        <Button size="sm">{dict.tracker.continue}</Button>
      </Link>
    </Card>
  );
}
