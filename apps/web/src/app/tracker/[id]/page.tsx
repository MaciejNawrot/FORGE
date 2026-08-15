import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { SessionDetail } from '@/features/tracker';
import { getServerApiClient } from '@/shared/api';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function TrainingSessionPage({ params }: PageProps<'/tracker/[id]'>) {
  const dict = await getServerDictionary();
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.training.getSession({ params: { id } });

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.sessionDetail.loginRequired}</Text>
      </main>
    );
  }
  if (result.status === 404) notFound();

  const session = result.body;
  const planResult = session.planId
    ? await apiClient.workouts.getPlan({ params: { id: session.planId } })
    : null;
  const plan = planResult && planResult.status === 200 ? planResult.body : null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <SessionDetail session={session} plan={plan} />
    </main>
  );
}
