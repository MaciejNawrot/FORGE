'use client';

import type { Exercise } from '@acme/contracts';
import { Input, Text } from '@acme/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocale } from '@/lib/i18n/context';
import { apiClient } from '@/shared/api';

export function ExercisePicker({ onSelect }: { onSelect: (exercise: Exercise) => void }) {
  const { dict } = useLocale();
  const [search, setSearch] = useState('');

  const { data: results } = useQuery({
    queryKey: ['exercises', search],
    queryFn: async () => {
      const result = await apiClient.exercises.listExercises({ query: { search } });
      return result.status === 200 ? result.body : [];
    },
    enabled: search.trim().length > 0,
  });

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder={dict.common.searchExercises}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {results && results.length > 0 && (
        <div className="border-border max-h-48 overflow-y-auto rounded-md border">
          {results.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => {
                onSelect(exercise);
                setSearch('');
              }}
              className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left"
            >
              <span className="text-sm font-medium">{exercise.name}</span>
              <span className="text-muted-foreground text-xs">
                {exercise.muscleGroups.join(', ')}
              </span>
            </button>
          ))}
        </div>
      )}
      {search.trim().length > 0 && results && results.length === 0 && (
        <Text tone="muted" variant="caption">
          {dict.common.noExercisesMatch(search)}
        </Text>
      )}
    </div>
  );
}
