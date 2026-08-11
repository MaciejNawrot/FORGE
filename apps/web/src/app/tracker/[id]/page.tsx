import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { SessionDetail } from '@/components/session-detail';
import { getServerApiClient } from '@/lib/api-server';

export default async function TrainingSessionPage({ params }: PageProps<'/tracker/[id]'>) {
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.training.getSession({ params: { id } });

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">Log in to see this training session.</Text>
      </main>
    );
  }
  if (result.status === 404) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <SessionDetail session={result.body} />
    </main>
  );
}
