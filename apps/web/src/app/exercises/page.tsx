'use client';

import { Card, Input, Stack, Text } from '@acme/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EquipmentIcon } from '@/components/equipment-icon';
import { apiClient } from '@/lib/api-client';

export default function ExercisesPage() {
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
        <Text variant="heading">Exercise Library</Text>
        <Input
          placeholder="Search exercises…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Stack gap="sm">
          {isPending && <Text tone="muted">Loading…</Text>}
          {!isPending && data?.length === 0 && (
            <Text tone="muted">No exercises match "{search}".</Text>
          )}
          {data?.map((exercise) => (
            <Card key={exercise.id}>
              <Stack direction="row" gap="sm" align="center">
                <span className="bg-secondary text-secondary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <EquipmentIcon equipment={exercise.equipment} className="h-5 w-5" />
                </span>
                <Stack gap="none" className="min-w-0 flex-1">
                  <Text variant="body" className="block font-medium">
                    {exercise.name}
                  </Text>
                  <Text tone="muted" variant="caption" className="block">
                    {exercise.description}
                  </Text>
                </Stack>
                <Stack direction="row" gap="xs" className="shrink-0 flex-wrap justify-end">
                  {exercise.muscleGroups.map((group) => (
                    <span
                      key={group}
                      className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs capitalize"
                    >
                      {group}
                    </span>
                  ))}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </main>
  );
}
