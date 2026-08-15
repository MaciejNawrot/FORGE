'use client';

import type { TrainingSession } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import Link from 'next/link';
import { useLocale } from '@/shared/i18n/context';
import { trainingTypeStyles } from '@/utils';

export function SessionListItem({ session }: { session: TrainingSession }) {
  const { dict } = useLocale();
  const style = trainingTypeStyles[session.type];

  return (
    <Link href={`/tracker/${session.id}`}>
      <Card className="glass-panel hover:border-primary/50 transition-colors">
        <Stack direction="row" justify="between" align="center" gap="sm">
          <Stack direction="row" gap="sm" align="center">
            <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
            <Text variant="body">{session.date}</Text>
          </Stack>
          <span className={`font-data rounded-full px-2 py-0.5 text-xs uppercase ${style.badge}`}>
            {dict.trainingType[session.type]}
          </span>
        </Stack>
      </Card>
    </Link>
  );
}
