'use client';

import { Button, Stack, Text } from '@acme/ui';
import { useLocale } from '@/lib/i18n/context';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useLocale();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="sm" align="start">
        <Text variant="heading">{dict.errorPage.title}</Text>
        <Text tone="muted">{error.message || dict.errorPage.fallbackMessage}</Text>
        <Button size="sm" onClick={reset}>
          {dict.errorPage.tryAgain}
        </Button>
      </Stack>
    </main>
  );
}
