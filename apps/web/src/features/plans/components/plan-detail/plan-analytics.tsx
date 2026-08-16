import type { TrainingSessionWithExercises } from '@acme/contracts';
import { Badge, Card, Text } from '@acme/ui';
import { Award } from 'lucide-react';
import Link from 'next/link';
import { VolumeChart } from '@/features/progress';
import { formatDuration } from '@/features/tracker';
import type { Dictionary } from '@/shared/i18n/dictionary';
import { trainingTypeStyles } from '@/utils';
import { computePlanStats } from '../../lib/plan-analytics';

function formatKg(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

export function PlanAnalytics({
  sessions,
  dict,
}: {
  sessions: TrainingSessionWithExercises[];
  dict: Dictionary;
}) {
  if (sessions.length === 0) {
    return <Text tone="muted">{dict.planAnalytics.noSessions}</Text>;
  }

  const stats = computePlanStats(sessions);
  const bestEntries = [...stats.bestByExercise.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3);
  const recentSessions = [...sessions].reverse().slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <Text variant="subheading" className="font-display text-primary text-xl uppercase">
        {dict.planAnalytics.heading}
      </Text>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.planAnalytics.totalVolume}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {formatKg(stats.totalVolumeKg)} <span className="text-lg">kg</span>
          </Text>
        </Card>
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.planAnalytics.sessions}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {stats.sessionCount}
          </Text>
        </Card>
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.planAnalytics.avgDuration}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {formatDuration(stats.avgDurationSeconds)}
          </Text>
        </Card>
        <Card className="glass-panel flex flex-col gap-2">
          <Text tone="muted" variant="caption" className="font-data uppercase">
            {dict.progress.personalBests}
          </Text>
          <Text variant="heading" className="font-display text-primary text-3xl">
            {stats.bestByExercise.size}
          </Text>
        </Card>
      </div>

      <Card className="glass-panel flex flex-col gap-4">
        <VolumeChart
          values={stats.volumeBySession.map((entry) => entry.volume)}
          labels={stats.volumeBySession.map((entry) => entry.date.slice(5))}
        />
      </Card>

      <Card className="glass-panel flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Award className="text-primary h-5 w-5" aria-hidden="true" />
          <Text variant="subheading" className="font-display text-primary text-xl uppercase">
            {dict.progress.personalBests}
          </Text>
        </div>
        {bestEntries.length === 0 ? (
          <Text tone="muted">{dict.progress.noBests}</Text>
        ) : (
          <div className="flex flex-col gap-3">
            {bestEntries.map(([name, best]) => (
              <div key={name} className="bg-muted flex items-center justify-between rounded-lg p-3">
                <div className="flex flex-col">
                  <Text className="font-bold">{name}</Text>
                  <Text tone="muted" variant="caption" className="font-data">
                    {dict.progress.bestLine(best.reps, best.date)}
                  </Text>
                </div>
                <Text variant="subheading" className="font-display text-primary">
                  {formatKg(best.weight)} <span className="text-muted-foreground text-sm">kg</span>
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
          {dict.tracker.recentTrainings}
        </Text>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentSessions.map((session) => {
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
      </div>
    </div>
  );
}
