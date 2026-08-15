import { Card, Stack, Text } from '@acme/ui';
import { Dumbbell, Flame, Footprints, Play, Timer, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { StreakBanner } from '@/features/tracker';
import { getServerApiClient } from '@/shared/api';
import { SessionListItem } from '@/shared/components';
import { getServerDictionary } from '@/shared/i18n/server';
import { toLocalIsoDate } from '@/utils';

export default async function Home() {
  const dict = await getServerDictionary();
  const apiClient = await getServerApiClient();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 89);

  const result = await apiClient.training.listSessions({
    query: { from: toLocalIsoDate(from), to: toLocalIsoDate(to) },
  });

  if (result.status === 401) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          Forge
        </Text>
        <Text tone="muted">{dict.home.tagline}</Text>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/login"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 font-semibold"
          >
            {dict.home.loginRegister}
          </Link>
          <Link href="/plans/templates" className="border-border rounded-md border px-4 py-2">
            {dict.home.browseTemplates}
          </Link>
        </div>
      </main>
    );
  }

  const sessions = result.body;
  const todayIso = toLocalIsoDate(to);

  const weekStart = new Date(to);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return toLocalIsoDate(date);
  });

  const trainedDates = new Set(sessions.map((session) => session.date));
  const workoutsThisWeek = week.filter((date) => trainedDates.has(date)).length;
  const recent = [...sessions].reverse().slice(0, 5);

  const trainedToday = trainedDates.has(todayIso);
  let streak = 0;
  const cursor = new Date(to);
  if (!trainedToday) cursor.setDate(cursor.getDate() - 1);
  while (trainedDates.has(toLocalIsoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Card className="glass-panel flex flex-row items-center gap-4">
          <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            <Flame className="text-primary h-6 w-6" fill="currentColor" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <Text variant="heading" className="font-display text-primary text-3xl leading-none">
              {streak}
            </Text>
            <Text tone="muted" variant="caption" className="font-data tracking-widest uppercase">
              {dict.home.dayStreak}
            </Text>
          </div>
        </Card>

        {streak > 0 && !trainedToday && <StreakBanner nextDay={streak + 1} />}

        <section>
          <Text
            tone="muted"
            variant="caption"
            className="font-data mb-2 block tracking-widest uppercase"
          >
            {dict.home.thisWeek}
          </Text>
          <Stack direction="row" gap="xs" className="overflow-x-auto pb-1">
            {week.map((date, i) => {
              const trained = trainedDates.has(date);
              const isToday = date === todayIso;
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <Text tone="muted" variant="caption" className="font-data">
                    {dict.home.weekdays[i]}
                  </Text>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                      isToday
                        ? 'bg-primary text-primary-foreground glow-primary'
                        : trained
                          ? 'bg-accent text-foreground'
                          : 'border-border text-muted-foreground border'
                    }`}
                  >
                    {Number(date.slice(-2))}
                  </div>
                </div>
              );
            })}
          </Stack>
        </section>

        <Link href="/plans" className="block">
          <div className="glass-panel relative flex h-56 flex-col justify-end gap-2 overflow-hidden rounded-xl p-6">
            <div className="from-primary/20 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
            <div className="relative z-10 flex flex-col gap-2">
              <span className="bg-muted text-primary font-data w-fit rounded-full px-3 py-1 text-xs uppercase">
                {dict.home.strengthFocus}
              </span>
              <Text
                variant="heading"
                className="font-display text-primary text-3xl leading-tight uppercase"
              >
                {dict.home.readyForWorkout}
              </Text>
              <span className="bg-primary text-primary-foreground font-display mt-2 inline-flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-sm uppercase">
                {dict.home.startAPlan}
                <Play className="h-4 w-4" fill="currentColor" />
              </span>
            </div>
          </div>
        </Link>

        <section>
          <Text
            tone="muted"
            variant="caption"
            className="font-data mb-2 block tracking-widest uppercase"
          >
            {dict.home.todaysOutput}
          </Text>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {/* No calorie/step/active-time tracking yet — mock values to match the design. */}
            <Card className="glass-panel flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Flame className="text-primary h-5 w-5" fill="currentColor" aria-hidden="true" />
                <Text tone="muted" variant="caption" className="font-data uppercase">
                  {dict.home.kcal}
                </Text>
              </div>
              <div className="flex items-end gap-1">
                <Text variant="heading" className="font-display text-3xl">
                  840
                </Text>
                <Text tone="muted" variant="caption" className="mb-1">
                  / 2500
                </Text>
              </div>
              <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full w-1/3" />
              </div>
            </Card>
            <Card className="glass-panel flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Footprints className="text-muted-foreground h-5 w-5" aria-hidden="true" />
                <Text tone="muted" variant="caption" className="font-data uppercase">
                  {dict.home.steps}
                </Text>
              </div>
              <Text variant="heading" className="font-display text-3xl">
                6,240
              </Text>
              <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
                <div className="bg-muted-foreground h-full w-1/2" />
              </div>
            </Card>
            <Card className="glass-panel col-span-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Timer className="text-primary h-5 w-5" aria-hidden="true" />
                <Text tone="muted" variant="caption" className="font-data uppercase">
                  {dict.home.activeTime}
                </Text>
              </div>
              <Text variant="heading" className="font-display text-3xl">
                1h 15m
              </Text>
              <div className="mt-auto flex h-8 w-full items-end justify-between gap-1">
                <div className="bg-muted h-1/4 w-1/6 rounded-t-sm" />
                <div className="bg-muted h-1/2 w-1/6 rounded-t-sm" />
                <div className="bg-primary glow-primary h-full w-1/6 rounded-t-sm" />
                <div className="bg-muted h-1/3 w-1/6 rounded-t-sm" />
                <div className="bg-muted h-1/5 w-1/6 rounded-t-sm" />
              </div>
            </Card>
          </div>
        </section>

        <Stack direction="row" gap="sm">
          <Card className="glass-panel flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <Dumbbell className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              <Text tone="muted" variant="caption" className="font-data uppercase">
                {dict.home.thisWeek}
              </Text>
            </div>
            <Text variant="heading" className="font-display block text-2xl">
              {workoutsThisWeek}
            </Text>
            <Text tone="muted" variant="caption">
              {dict.home.workoutsLabel}
            </Text>
          </Card>
          <Card className="glass-panel flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <TrendingUp className="text-primary h-4 w-4" aria-hidden="true" />
              <Text tone="muted" variant="caption" className="font-data uppercase">
                {dict.home.last90Days}
              </Text>
            </div>
            <Text variant="heading" className="font-display block text-2xl">
              {sessions.length}
            </Text>
            <Text tone="muted" variant="caption">
              {dict.home.trainingsLoggedLabel}
            </Text>
          </Card>
        </Stack>

        <Stack gap="sm">
          <Stack direction="row" justify="between" align="center">
            <Text variant="caption" tone="muted" className="font-data tracking-widest uppercase">
              {dict.home.recentActivity}
            </Text>
            <Link href="/tracker" className="text-primary text-sm underline">
              {dict.home.viewAll}
            </Link>
          </Stack>
          {recent.length === 0 ? (
            <Text tone="muted">{dict.home.noTrainings}</Text>
          ) : (
            recent.map((session) => <SessionListItem key={session.id} session={session} />)
          )}
        </Stack>
      </Stack>
    </main>
  );
}
