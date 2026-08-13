import { Button, Stack, Text } from '@acme/ui';
import Link from 'next/link';
import { getServerDictionary } from '@/lib/i18n/server';

export default async function NotFound() {
  const dict = await getServerDictionary();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="sm" align="start">
        <Text variant="heading">{dict.notFound.title}</Text>
        <Text tone="muted">{dict.notFound.body}</Text>
        <Link href="/">
          <Button size="sm">{dict.notFound.backHome}</Button>
        </Link>
      </Stack>
    </main>
  );
}
