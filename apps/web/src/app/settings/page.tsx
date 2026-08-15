import { Card, Stack, Text } from '@acme/ui';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function SettingsPage() {
  const dict = await getServerDictionary();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          {dict.settings.title}
        </Text>
        <Card className="glass-panel flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Text variant="subheading" className="font-display text-xl uppercase">
              {dict.settings.theme}
            </Text>
            <Text tone="muted" variant="caption">
              {dict.settings.savedToDevice}
            </Text>
          </div>
          <ThemeSwitcher />
        </Card>
        <Card className="glass-panel flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Text variant="subheading" className="font-display text-xl uppercase">
              {dict.settings.language}
            </Text>
            <Text tone="muted" variant="caption">
              {dict.settings.savedToDevice}
            </Text>
          </div>
          <LanguageSwitcher />
        </Card>
      </Stack>
    </main>
  );
}
