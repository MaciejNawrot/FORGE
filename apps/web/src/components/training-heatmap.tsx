'use client';

import type { TrainingSession } from '@acme/contracts';
import { useLocale } from '@/lib/i18n/context';
import { toLocalIsoDate, trainingTypeStyles, trainingTypes } from '@/lib/training-colors';

type Day = { date: string; sessions: TrainingSession[] };

function buildWeeks(sessions: TrainingSession[]): Day[][] {
  const byDate = new Map<string, TrainingSession[]>();
  for (const session of sessions) {
    const list = byDate.get(session.date) ?? [];
    list.push(session);
    byDate.set(session.date, list);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const weeks: Day[][] = [];
  let week: Day[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const dateStr = toLocalIsoDate(cursor);
    week.push({ date: dateStr, sessions: byDate.get(dateStr) ?? [] });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

export function TrainingHeatmap({ sessions }: { sessions: TrainingSession[] }) {
  const { dict } = useLocale();
  const weeks = buildWeeks(sessions);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week) => (
          <div key={week[0]?.date} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const dominant = day.sessions[0]?.type;
              const style = dominant ? trainingTypeStyles[dominant] : undefined;
              const title = day.sessions.length
                ? `${day.date}: ${day.sessions.map((s) => dict.trainingType[s.type]).join(', ')}`
                : day.date;
              return (
                <div
                  key={day.date}
                  title={title}
                  className={`h-3 w-3 rounded-sm ${style ? style.dot : 'bg-muted'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {trainingTypes.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${trainingTypeStyles[type].dot}`} />
            <span className="text-muted-foreground text-xs">{dict.trainingType[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
