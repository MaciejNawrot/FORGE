import type { TrainingSession } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import Link from 'next/link';
import { trainingTypeStyles } from '@/lib/training-colors';

export function SessionListItem({ session }: { session: TrainingSession }) {
  const style = trainingTypeStyles[session.type];

  return (
    <Link href={`/tracker/${session.id}`}>
      <Card>
        <Stack direction="row" justify="between" align="center" gap="sm">
          <Stack direction="row" gap="sm" align="center">
            <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
            <Text variant="body">{session.date}</Text>
          </Stack>
          <span className={`rounded-full px-2 py-0.5 text-xs ${style.badge}`}>{style.label}</span>
        </Stack>
      </Card>
    </Link>
  );
}
