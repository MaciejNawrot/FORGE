import { Text } from '@acme/ui';
import { notFound } from 'next/navigation';
import { WorkoutTemplateDetail } from '@/features/plans';
import { getServerApiClient } from '@/shared/api';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function TemplateDetailPage({ params }: PageProps<'/plans/templates/[id]'>) {
  const dict = await getServerDictionary();
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.listTemplates();

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.templates.loginRequired}</Text>
      </main>
    );
  }

  const template = result.body.find((item) => item.id === id);
  if (!template) notFound();

  return <WorkoutTemplateDetail template={template} />;
}
