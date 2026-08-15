import { Stack, Text } from '@acme/ui';
import { TemplateLibrary } from '@/components/template-library';
import { getServerApiClient } from '@/shared/api';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function TemplatesPage() {
  const dict = await getServerDictionary();
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.listTemplates();

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.templates.loginRequired}</Text>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Stack gap="lg">
        <Stack gap="xs">
          <Text variant="heading" className="font-display text-primary text-3xl uppercase">
            {dict.templates.title}
          </Text>
          <Text tone="muted">{dict.templates.description}</Text>
        </Stack>
        <TemplateLibrary templates={result.body} />
      </Stack>
    </main>
  );
}
