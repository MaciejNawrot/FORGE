import { Stack, Text } from '@acme/ui';
import { Library } from 'lucide-react';
import Link from 'next/link';
import { CreatePlanForm } from '@/components/create-plan-form';
import { PlanListItem } from '@/components/plan-list-item';
import { getServerDictionary } from '@/lib/i18n/server';
import { getServerApiClient } from '@/shared/api';

export default async function PlansPage() {
  const dict = await getServerDictionary();
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.listPlans();

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.plans.loginRequired}</Text>
      </main>
    );
  }

  const plans = result.body;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Stack gap="lg">
        <Stack direction="row" justify="between" align="center">
          <Text variant="heading" className="font-display text-primary text-3xl uppercase">
            {dict.plans.title}
          </Text>
          <Link
            href="/plans/templates"
            className="text-primary font-data flex items-center gap-1 text-sm uppercase hover:underline"
          >
            <Library className="h-4 w-4" aria-hidden="true" />
            {dict.plans.browseTemplates}
          </Link>
        </Stack>
        <CreatePlanForm />
        {plans.length === 0 ? (
          <Text tone="muted">{dict.plans.empty}</Text>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanListItem key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </Stack>
    </main>
  );
}
