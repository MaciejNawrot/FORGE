import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { PlanDetail } from '@/features/plans';
import { getServerApiClient } from '@/shared/api/api-server';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function PlanDetailPage({ params }: PageProps<'/plans/[id]'>) {
  const dict = await getServerDictionary();
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.getPlan({ params: { id } });

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.planDetail.loginRequired}</Text>
      </main>
    );
  }
  if (result.status === 404) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <PlanDetail plan={result.body} />
    </main>
  );
}
