import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { PlanAnalytics, PlanDetail } from '@/features/plans';
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

  const sessionsResult = await apiClient.training.listSessions({ query: { planId: id } });
  const sessionList = sessionsResult.status === 200 ? sessionsResult.body : [];
  const sessionDetails = await Promise.all(
    sessionList.map((session) => apiClient.training.getSession({ params: { id: session.id } })),
  );
  const sessions = sessionDetails.flatMap((detail) => (detail.status === 200 ? [detail.body] : []));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-col gap-6">
        <PlanDetail plan={result.body} />
        <PlanAnalytics sessions={sessions} dict={dict} />
      </div>
    </main>
  );
}
