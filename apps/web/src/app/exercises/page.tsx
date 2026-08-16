'use client';

import { Card, Input, Stack, Text } from '@acme/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EquipmentIcon } from '@/features/exercises';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';

export default function ExercisesPage() {
  const { dict } = useLocale();
  const [search, setSearch] = useState('');

  const { data, isPending } = useQuery({
    queryKey: ['exercises', search],
    queryFn: async () => {
      const result = await apiClient.exercises.listExercises({
        query: { search: search || undefined },
      });
      return result.status === 200 ? result.body : [];
    },
  });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          {dict.exercises.title}
        </Text>
        <Input
          placeholder={dict.common.searchExercises}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Stack gap="sm">
          {isPending && <Text tone="muted">{dict.common.loading}</Text>}
          {!isPending && data?.length === 0 && (
            <Text tone="muted">{dict.common.noExercisesMatch(search)}</Text>
          )}
          {data?.map((exercise) => (
            <Card
              key={exercise.id}
              className="glass-panel hover:border-primary/50 transition-colors"
            >
              <Stack direction="row" gap="sm" align="center">
                <span className="bg-secondary text-secondary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <EquipmentIcon equipment={exercise.equipment} className="h-5 w-5" />
                </span>
                <Stack gap="none" className="min-w-0 flex-1">
                  <Text variant="body" className="font-display block uppercase">
                    {exercise.name}
                  </Text>
                  <Text tone="muted" variant="caption" className="font-data block">
                    {exercise.description}
                  </Text>
                </Stack>
                <Stack direction="row" gap="xs" className="shrink-0 flex-wrap justify-end">
                  {exercise.muscleGroups.map((group) => (
                    <span
                      key={group}
                      className="bg-primary/15 text-primary font-data rounded-full px-2 py-0.5 text-xs uppercase"
                    >
                      {group}
                    </span>
                  ))}
                </Stack>
                <Link
                  href={`/exercises/${exercise.id}`}
                  aria-label={dict.exercises.viewDetails}
                  className="text-muted-foreground hover:text-primary hover:bg-accent shrink-0 rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </main>
  );
}
