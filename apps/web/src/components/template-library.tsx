'use client';

import type { TrainingTypeValue, WorkoutPlanWithExercises } from '@acme/contracts';
import { Card, Input, Text } from '@acme/ui';
import { Dumbbell, Repeat, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ForkTemplateButton } from '@/components/fork-template-button';
import { useLocale } from '@/lib/i18n/context';
import { trainingTypeStyles } from '@/lib/training-colors';

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-data shrink-0 rounded-full px-4 py-2 text-xs uppercase transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary hover:text-primary border'
      }`}
    >
      {children}
    </button>
  );
}

export function TemplateLibrary({ templates }: { templates: WorkoutPlanWithExercises[] }) {
  const { dict } = useLocale();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TrainingTypeValue | null>(null);

  const categories = useMemo(() => {
    const values = new Set(
      templates
        .map((template) => template.category)
        .filter((value): value is TrainingTypeValue => value !== null),
    );
    return [...values];
  }, [templates]);

  const filtered = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = !category || template.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder={dict.templates.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryPill active={category === null} onClick={() => setCategory(null)}>
            {dict.templates.allWorkouts}
          </CategoryPill>
          {categories.map((value) => (
            <CategoryPill
              key={value}
              active={category === value}
              onClick={() => setCategory(value)}
            >
              {dict.trainingType[value]}
            </CategoryPill>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Text tone="muted">{dict.templates.noMatch(search)}</Text>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const style = template.category ? trainingTypeStyles[template.category] : null;
            const totalSets = template.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
            return (
              <Card
                key={template.id}
                className="glass-panel relative flex h-56 flex-col justify-between overflow-hidden"
              >
                <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
                <div className="relative z-10 flex items-start justify-between gap-2">
                  {style && template.category ? (
                    <span
                      className={`font-data rounded-full px-2 py-1 text-xs uppercase ${style.badge}`}
                    >
                      {dict.trainingType[template.category]}
                    </span>
                  ) : (
                    <span />
                  )}
                  <ForkTemplateButton templateId={template.id} />
                </div>
                <Link
                  href={`/plans/templates/${template.id}`}
                  className="relative z-10 flex flex-col gap-2"
                >
                  <Text
                    variant="subheading"
                    className="font-display text-primary text-2xl uppercase"
                  >
                    {template.name}
                  </Text>
                  {template.notes && (
                    <Text tone="muted" variant="caption" className="line-clamp-2">
                      {template.notes}
                    </Text>
                  )}
                  <div className="text-muted-foreground font-data flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
                      {dict.common.exerciseCount(template.exercises.length)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                      {dict.common.setCount(totalSets)}
                    </span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
