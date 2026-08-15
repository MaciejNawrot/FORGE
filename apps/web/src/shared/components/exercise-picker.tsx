'use client';

import type { Exercise } from '@acme/contracts';
import { Input, Text } from '@acme/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';

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
        <div className="glass-panel max-h-48 overflow-y-auto rounded-md">
          {results.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => {
                onSelect(exercise);
                setSearch('');
              }}
              className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left transition-colors"
            >
              <span className="font-display uppercase">{exercise.name}</span>
              <span className="text-muted-foreground font-data text-xs uppercase">
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
