'use client';

import { Button, Stack, Text } from '@acme/ui';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="sm" align="start">
        <Text variant="heading">Something went wrong</Text>
        <Text tone="muted">{error.message || 'An unexpected error occurred.'}</Text>
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      </Stack>
    </main>
  );
}
