import { Button, Stack, Text } from '@acme/ui';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="sm" align="start">
        <Text variant="heading">Not found</Text>
        <Text tone="muted">This page doesn’t exist, or the item was deleted.</Text>
        <Link href="/">
          <Button size="sm">Back home</Button>
        </Link>
      </Stack>
    </main>
  );
}
