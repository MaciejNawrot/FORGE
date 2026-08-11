import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { PlanDetail } from '@/components/plan-detail';
import { getServerApiClient } from '@/lib/api-server';

export default async function PlanDetailPage({ params }: PageProps<'/plans/[id]'>) {
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.getPlan({ params: { id } });

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">Log in to see this workout plan.</Text>
      </main>
    );
  }
  if (result.status === 404) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <PlanDetail plan={result.body} />
    </main>
  );
}
