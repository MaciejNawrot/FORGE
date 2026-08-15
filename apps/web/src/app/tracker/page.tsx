import { Badge, Card, Text } from '@acme/ui';
import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { ActiveSessionBanner, AddTrainingForm, StartPlanButton } from '@/features/tracker';
import { getServerApiClient } from '@/shared/api/api-server';
import { TrainingHeatmap } from '@/shared/components';
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
    <main className="mx-auto max-w-5xl p-6">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const style = plan.category ? trainingTypeStyles[plan.category] : null;
                  return (
                    <Card
                      key={plan.id}
                      className="glass-panel relative flex h-48 flex-col justify-between overflow-hidden"
                    >
                      <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
                      <div className="relative z-10">
                        {style && plan.category ? (
                          <Badge className={style.badge}>{dict.trainingType[plan.category]}</Badge>
                        ) : (
                          <span />
                        )}
                      </div>
                      <div className="relative z-10 flex flex-col gap-2">
                        <Text
                          variant="subheading"
                          className="font-display text-primary truncate text-2xl uppercase"
                        >
                          {plan.name}
                        </Text>
                        <div className="text-muted-foreground font-data flex items-center gap-1 text-xs">
                          <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
                          {dict.common.exerciseCount(plan.exerciseCount)}
                        </div>
                        <StartPlanButton planId={plan.id} category={plan.category} />
                      </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((session) => {
                const style = trainingTypeStyles[session.type];
                return (
                  <Link key={session.id} href={`/tracker/${session.id}`}>
                    <Card className="glass-panel hover:border-primary/50 relative flex h-48 flex-col justify-between overflow-hidden transition-colors">
                      <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
                      <div className="relative z-10">
                        <Badge className={style.badge}>{dict.trainingType[session.type]}</Badge>
                      </div>
                      <Text
                        variant="subheading"
                        className="font-display text-primary relative z-10 text-2xl uppercase"
                      >
                        {session.date}
                      </Text>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
