'use client';

import { createTrainingSessionInputSchema } from '@acme/contracts';
import { Button, Input, Stack, Text } from '@acme/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useLocale } from '@/lib/i18n/context';
import { apiClient } from '@/shared/api';
import { toLocalIsoDate, trainingTypes } from '@/utils';

type FormValues = z.infer<typeof createTrainingSessionInputSchema>;

function todayIso(): string {
  return toLocalIsoDate(new Date());
}

export function AddTrainingForm() {
  const router = useRouter();
  const { dict } = useLocale();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTrainingSessionInputSchema),
    defaultValues: { date: todayIso(), type: 'strength' },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const result = await apiClient.training.createSession({ body: values });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: (session) => {
      router.push(`/tracker/${session.id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <Stack direction="row" gap="sm" align="end" className="glass-panel flex-wrap rounded-lg p-4">
        <Stack gap="xs">
          <Text variant="caption">{dict.common.date}</Text>
          <Input type="date" max={todayIso()} {...register('date')} />
        </Stack>
        <Stack gap="xs">
          <Text variant="caption">{dict.common.type}</Text>
          <select
            className="border-border bg-background text-foreground h-10 rounded-md border px-3 text-base"
            {...register('type')}
          >
            {trainingTypes.map((type) => (
              <option key={type} value={type}>
                {dict.trainingType[type]}
              </option>
            ))}
          </select>
        </Stack>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? dict.common.logging : dict.addTrainingForm.submit}
        </Button>
        {(errors.date || mutation.isError) && (
          <Text variant="caption" tone="destructive" className="w-full">
            {errors.date?.message ?? mutation.error?.message}
          </Text>
        )}
      </Stack>
    </form>
  );
}
