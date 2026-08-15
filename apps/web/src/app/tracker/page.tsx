import { Card, Text } from '@acme/ui';
import { Dumbbell } from 'lucide-react';
import { ActiveSessionBanner } from '@/components/active-session-banner';
import { AddTrainingForm } from '@/components/add-training-form';
import { StartPlanButton } from '@/components/start-plan-button';
import { getServerApiClient } from '@/shared/api';
import { SessionListItem, TrainingHeatmap } from '@/shared/components';
import { getServerDictionary } from '@/shared/i18n/server';
import { toLocalIsoDate, trainingTypeStyles } from '@/utils';

export default async function TrackerPage() {
  const dict = await getServerDictionary();
  const apiClient = await getServerApiClient();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 364);

  const [sessionsResult, plansResult] = await Promise.all([
    apiClient.training.listSessions({
      query: { from: toLocalIsoDate(from), to: toLocalIsoDate(to) },
    }),
    apiClient.workouts.listPlans(),
  ]);

  if (sessionsResult.status === 401 || plansResult.status === 401) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Text tone="muted">{dict.tracker.loginRequired}</Text>
      </main>
    );
  }

  const sessions = sessionsResult.body;
  const plans = plansResult.body;
  const recent = [...sessions].reverse().slice(0, 8);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex flex-col gap-6">
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          {dict.nav.tracking}
        </Text>

        <ActiveSessionBanner />

        <div className="flex flex-col gap-3">
          <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
            {dict.tracker.startHeading}
          </Text>
          <AddTrainingForm />

          {plans.length > 0 && (
            <div className="flex flex-col gap-2">
              <Text tone="muted" variant="caption" className="font-data uppercase">
                {dict.tracker.fromPlanHeading}
              </Text>
              <div className="flex flex-col gap-2">
                {plans.map((plan) => {
                  const style = plan.category ? trainingTypeStyles[plan.category] : null;
                  return (
                    <Card
                      key={plan.id}
                      className="glass-panel flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <Text className="truncate font-medium">{plan.name}</Text>
                        <div className="text-muted-foreground font-data flex items-center gap-2 text-xs">
                          {style && plan.category && (
                            <span className={`rounded-full px-2 py-0.5 uppercase ${style.badge}`}>
                              {dict.trainingType[plan.category]}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
                            {dict.common.exerciseCount(plan.exerciseCount)}
                          </span>
                        </div>
                      </div>
                      <StartPlanButton planId={plan.id} category={plan.category} />
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Card className="glass-panel">
          <Text
            tone="muted"
            variant="caption"
            className="font-data mb-3 block tracking-widest uppercase"
          >
            {dict.tracker.history}
          </Text>
          <TrainingHeatmap sessions={sessions} />
        </Card>

        <div className="flex flex-col gap-3">
          <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
            {dict.tracker.recentTrainings}
          </Text>
          {recent.length === 0 ? (
            <Text tone="muted">{dict.tracker.noTrainings}</Text>
          ) : (
            recent.map((session) => <SessionListItem key={session.id} session={session} />)
          )}
        </div>
      </div>
    </main>
  );
}
