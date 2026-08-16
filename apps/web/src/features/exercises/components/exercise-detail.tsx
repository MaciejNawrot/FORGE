import type { Exercise } from '@acme/contracts';
import { Card, Stack, Text } from '@acme/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Dictionary } from '@/shared/i18n/dictionary';
import { EquipmentIcon } from './equipment-icon';

export function ExerciseDetail({ exercise, dict }: { exercise: Exercise; dict: Dictionary }) {
  return (
    <Stack gap="lg" className="pb-24">
      <Link
        href="/exercises"
        className="text-muted-foreground hover:text-primary flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.exercises.title}
      </Link>

      <Stack direction="row" gap="sm" align="center">
        <span className="bg-secondary text-secondary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <EquipmentIcon equipment={exercise.equipment} className="h-6 w-6" />
        </span>
        <Stack gap="none" className="min-w-0 flex-1">
          <Text variant="heading" className="font-display text-primary block uppercase">
            {exercise.name}
          </Text>
          <Text tone="muted" variant="caption" className="font-data block">
            {exercise.description}
          </Text>
        </Stack>
      </Stack>

      <Stack direction="row" gap="xs" className="flex-wrap">
        {exercise.muscleGroups.map((group) => (
          <span
            key={group}
            className="bg-primary/15 text-primary font-data rounded-full px-2 py-0.5 text-xs uppercase"
          >
            {group}
          </span>
        ))}
      </Stack>

      {exercise.instructions && (
        <Card className="glass-panel">
          <Text variant="subheading" className="font-display mb-2 block text-lg uppercase">
            {dict.exercises.howToPerform}
          </Text>
          <Text variant="body">{exercise.instructions}</Text>
        </Card>
      )}

      {exercise.setupNotes && (
        <Card className="glass-panel">
          <Text variant="subheading" className="font-display mb-2 block text-lg uppercase">
            {dict.exercises.setupPosition}
          </Text>
          <Text variant="body">{exercise.setupNotes}</Text>
        </Card>
      )}

      {exercise.commonMistakes && (
        <Card className="glass-panel">
          <Text variant="subheading" className="font-display mb-2 block text-lg uppercase">
            {dict.exercises.commonMistakes}
          </Text>
          <Text variant="body">{exercise.commonMistakes}</Text>
        </Card>
      )}

      {exercise.videoUrl && (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary self-start text-sm underline underline-offset-2"
        >
          {dict.exercises.watchDemo}
        </a>
      )}
    </Stack>
  );
}
