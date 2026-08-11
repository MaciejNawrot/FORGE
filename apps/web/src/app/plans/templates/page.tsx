import { Card, Stack, Text } from '@acme/ui';
import { ForkTemplateButton } from '@/components/fork-template-button';
import { getServerApiClient } from '@/lib/api-server';

export default async function TemplatesPage() {
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.listTemplates();

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">Log in to browse plan templates.</Text>
      </main>
    );
  }

  const templates = result.body;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Text variant="heading">Plan Templates</Text>
        <Text tone="muted">
          Browse ready-made routines and add your own copy to your plans — edits never touch the
          original.
        </Text>
        <Stack gap="sm">
          {templates.map((template) => (
            <Card key={template.id}>
              <Stack gap="sm">
                <Stack direction="row" justify="between" align="center">
                  <Text variant="subheading">{template.name}</Text>
                  <ForkTemplateButton templateId={template.id} />
                </Stack>
                {template.notes && (
                  <Text tone="muted" variant="caption">
                    {template.notes}
                  </Text>
                )}
                <Text tone="muted" variant="caption">
                  {template.exercises.map((exercise) => exercise.name).join(' · ')}
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </main>
  );
}
