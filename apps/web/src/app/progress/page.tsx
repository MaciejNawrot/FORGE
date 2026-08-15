import { Card, Text } from '@acme/ui';
import { Award, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Mascot } from '@/components/mascot';
import { TrainingHeatmap } from '@/components/training-heatmap';
import { VolumeChart } from '@/components/volume-chart';
import { getServerApiClient } from '@/lib/api-server';
import { getServerDictionary } from '@/lib/i18n/server';
import { toLocalIsoDate } from '@/lib/training-colors';

const RANGES = { '1W': 1, '1M': 4, '3M': 13, YTD: 52 } as const;
type RangeKey = keyof typeof RANGES;
const DEFAULT_RANGE: RangeKey = '3M';

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function formatKg(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const dict = await getServerDictionary();
  const { range: rangeParam } = await searchParams;
  const range: RangeKey =
    rangeParam && rangeParam in RANGES ? (rangeParam as RangeKey) : DEFAULT_RANGE;
  const weeks = RANGES[range];

  const apiClient = await getServerApiClient();
  const to = new Date();

  const yearFrom = new Date(to);
  yearFrom.setDate(yearFrom.getDate() - 364);
  const yearResult = await apiClient.training.listSessions({
    query: { from: toLocalIsoDate(yearFrom), to: toLocalIsoDate(to) },
  });

  if (yearResult.status === 401) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Text tone="muted">{dict.progress.loginRequired}</Text>
      </main>
    );
  }

  const yearSessions = yearResult.body;

  const windowStart = startOfWeek(to);
  windowStart.setDate(windowStart.getDate() - (weeks - 1) * 7);
  const windowStartIso = toLocalIsoDate(windowStart);
  const windowSessions = yearSessions.filter((session) => session.date >= windowStartIso);

  const prevWindowStart = new Date(windowStart);
  prevWindowStart.setDate(prevWindowStart.getDate() - weeks * 7);
  const prevWindowStartIso = toLocalIsoDate(prevWindowStart);
  const prevWindowCount = yearSessions.filter(
    (session) => session.date >= prevWindowStartIso && session.date < windowStartIso,
  ).length;

  const details = await Promise.all(
    windowSessions.map((session) => apiClient.training.getSession({ params: { id: session.id } })),
  );

  const weekStarts = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(windowStart);
    start.setDate(start.getDate() + i * 7);
    return toLocalIsoDate(start);
  });

  const volumeByWeek = weekStarts.map(() => 0);
  const bestByExercise = new Map<string, { weight: number; reps: number; date: string }>();

  for (const detail of details) {
    if (detail.status !== 200) continue;
    const session = detail.body;
    let weekIndex = weekStarts.length - 1;
    for (let i = 0; i < weekStarts.length; i++) {
      const start = weekStarts[i];
      const next = weekStarts[i + 1];
      if (start !== undefined && session.date >= start && (!next || session.date < next)) {
        weekIndex = i;
        break;
      }
    }
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const weight = set.weightKg ?? 0;
        volumeByWeek[weekIndex] = (volumeByWeek[weekIndex] ?? 0) + set.reps * weight;
        const best = bestByExercise.get(exercise.exercise.name);
        if (weight > 0 && (!best || weight > best.weight)) {
          bestByExercise.set(exercise.exercise.name, {
            weight,
            reps: set.reps,
            date: session.date,
          });
        }
      }
    }
  }

  const personalBests = [...bestByExercise.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3);

  const midpoint = Math.floor(weeks / 2) || 1;
  const firstHalfVolume = volumeByWeek.slice(0, midpoint).reduce((sum, v) => sum + v, 0);
  const secondHalfVolume = volumeByWeek.slice(midpoint).reduce((sum, v) => sum + v, 0);
  const volumeChangePct =
    firstHalfVolume > 0
      ? Math.round(((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100)
      : 0;

  const workoutsDelta = windowSessions.length - prevWindowCount;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
          <div className="flex flex-col gap-1">
            <Text variant="heading" className="font-display text-primary text-3xl uppercase">
              {dict.progress.title}
            </Text>
            <Text tone="muted">{dict.progress.subtitle}</Text>
          </div>
          <div className="flex gap-2">
            {(Object.keys(RANGES) as RangeKey[]).map((key) => (
              <Link
                key={key}
                href={`/progress?range=${key}`}
                className={`font-data rounded-full px-4 py-2 text-xs uppercase transition-colors ${
                  key === range
                    ? 'bg-primary text-primary-foreground glow-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary border'
                }`}
              >
                {key}
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <Card className="glass-panel flex flex-col gap-4 md:col-span-8">
            <div className="flex items-center justify-between">
              <Text variant="subheading" className="font-display text-primary text-xl uppercase">
                {dict.progress.volumeProgression}
              </Text>
              <span
                className={`font-data flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  volumeChangePct >= 0
                    ? 'border-border text-primary'
                    : 'border-border text-destructive'
                }`}
              >
                {volumeChangePct >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {volumeChangePct >= 0 ? '+' : ''}
                {volumeChangePct}%
              </span>
            </div>
            <VolumeChart values={volumeByWeek} labels={weekStarts.map((_, i) => `W${i + 1}`)} />
          </Card>

          <div className="flex flex-col gap-4 md:col-span-4">
            <Card className="glass-panel flex flex-col gap-2">
              <Text tone="muted" variant="caption" className="font-data uppercase">
                {dict.progress.totalWorkouts}
              </Text>
              <div className="flex items-baseline gap-2">
                <Text variant="heading" className="font-display text-primary text-4xl">
                  {windowSessions.length}
                </Text>
                {workoutsDelta !== 0 && (
                  <span
                    className={`font-data flex items-center text-xs ${workoutsDelta > 0 ? 'text-primary' : 'text-destructive'}`}
                  >
                    {workoutsDelta > 0 ? (
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="h-3 w-3" aria-hidden="true" />
                    )}
                    {Math.abs(workoutsDelta)}
                  </span>
                )}
              </div>
            </Card>
            {/* No rest-timer feature yet — mock value to match the design. */}
            <Card className="glass-panel border-destructive flex flex-col gap-2 border-l-4">
              <Text tone="muted" variant="caption" className="font-data uppercase">
                {dict.progress.avgRestTime}
              </Text>
              <div className="flex items-baseline gap-2">
                <Text variant="heading" className="font-display text-primary text-4xl">
                  85<span className="text-lg">s</span>
                </Text>
                <span className="font-data text-destructive flex items-center text-xs">
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  5s
                </span>
              </div>
            </Card>
          </div>

          <Card className="glass-panel flex flex-col gap-4 md:col-span-6">
            <div className="flex items-center gap-2">
              <Award className="text-primary h-5 w-5" aria-hidden="true" />
              <Text variant="subheading" className="font-display text-primary text-xl uppercase">
                {dict.progress.personalBests}
              </Text>
            </div>
            {personalBests.length === 0 ? (
              <Text tone="muted">{dict.progress.noBests}</Text>
            ) : (
              <div className="flex flex-col gap-3">
                {personalBests.map(([name, best]) => (
                  <div
                    key={name}
                    className="bg-muted flex items-center justify-between rounded-lg p-3"
                  >
                    <div className="flex flex-col">
                      <Text className="font-bold">{name}</Text>
                      <Text tone="muted" variant="caption" className="font-data">
                        {dict.progress.bestLine(best.reps, best.date)}
                      </Text>
                    </div>
                    <Text variant="subheading" className="font-display text-primary">
                      {formatKg(best.weight)}{' '}
                      <span className="text-muted-foreground text-sm">kg</span>
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="glass-panel flex flex-col gap-4 md:col-span-6">
            <div className="flex items-center justify-between">
              <Text variant="subheading" className="font-display text-primary text-xl uppercase">
                {dict.progress.consistency}
              </Text>
              <Text tone="muted" variant="caption" className="font-data">
                {dict.progress.last12Months}
              </Text>
            </div>
            <TrainingHeatmap sessions={yearSessions} />
          </Card>
        </div>

        <Mascot sessionCount={yearSessions.length} className="glass-panel" />
      </div>
    </main>
  );
}
