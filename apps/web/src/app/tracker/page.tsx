import { Stack, Text } from '@acme/ui';
import { AddTrainingForm } from '@/components/add-training-form';
import { Mascot } from '@/components/mascot';
import { SessionListItem } from '@/components/session-list-item';
import { TrainingHeatmap } from '@/components/training-heatmap';
import { getServerApiClient } from '@/lib/api-server';
import { toLocalIsoDate } from '@/lib/training-colors';

export default async function TrackerPage() {
  const apiClient = await getServerApiClient();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 364);

  const result = await apiClient.training.listSessions({
    query: { from: toLocalIsoDate(from), to: toLocalIsoDate(to) },
  });

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Text tone="muted">Log in to see your training tracker.</Text>
      </main>
    );
  }

  const sessions = result.body;
  const recent = [...sessions].reverse().slice(0, 8);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Stack gap="lg">
        <Text variant="heading">Training Tracker</Text>
        <Mascot sessionCount={sessions.length} />
        <AddTrainingForm />
        <TrainingHeatmap sessions={sessions} />
        <Stack gap="sm">
          <Text variant="subheading" className="block">
            Recent trainings
          </Text>
          {recent.length === 0 ? (
            <Text tone="muted">No trainings logged yet — log one above.</Text>
          ) : (
            recent.map((session) => <SessionListItem key={session.id} session={session} />)
          )}
        </Stack>
      </Stack>
    </main>
  );
}
