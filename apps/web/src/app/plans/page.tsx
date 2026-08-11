import { Stack, Text } from '@acme/ui';
import Link from 'next/link';
import { CreatePlanForm } from '@/components/create-plan-form';
import { PlanListItem } from '@/components/plan-list-item';
import { getServerApiClient } from '@/lib/api-server';

export default async function PlansPage() {
  const apiClient = await getServerApiClient();
  const result = await apiClient.workouts.listPlans();

  if (result.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">Log in to see your workout plans.</Text>
      </main>
    );
  }

  const plans = result.body;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Stack direction="row" justify="between" align="center">
          <Text variant="heading">Workout Plans</Text>
          <Link href="/plans/templates" className="text-primary text-sm underline">
            Browse templates
          </Link>
        </Stack>
        <CreatePlanForm />
        <Stack gap="sm">
          {plans.length === 0 ? (
            <Text tone="muted">No plans yet — add one above.</Text>
          ) : (
            plans.map((plan) => <PlanListItem key={plan.id} plan={plan} />)
          )}
        </Stack>
      </Stack>
    </main>
  );
}
