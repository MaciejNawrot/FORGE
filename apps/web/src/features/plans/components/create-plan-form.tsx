'use client';

import { createWorkoutPlanInputSchema } from '@acme/contracts';
import { Button, Input, Stack, Text } from '@acme/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { apiClient, unwrapResult } from '@/shared/api';
import { useLocale } from '@/shared/i18n/context';

type FormValues = z.infer<typeof createWorkoutPlanInputSchema>;

export function CreatePlanForm() {
  const router = useRouter();
  const { dict } = useLocale();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(createWorkoutPlanInputSchema) });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const result = await apiClient.workouts.createPlan({ body: values });
      return unwrapResult(result, 201);
    },
    onSuccess: () => {
      reset();
      // The plan list is server-rendered; re-run the Server Component to
      // pick up the newly created row.
      router.refresh();
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <Stack direction="row" gap="sm" align="end" className="glass-panel flex-wrap rounded-lg p-4">
        <Stack gap="xs">
          <Text variant="caption">{dict.common.name}</Text>
          <Input placeholder={dict.createPlanForm.namePlaceholder} {...register('name')} />
          {errors.name && (
            <Text variant="caption" tone="destructive">
              {errors.name.message}
            </Text>
          )}
        </Stack>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? dict.common.adding : dict.createPlanForm.submit}
        </Button>
        {mutation.isError && (
          <Text variant="caption" tone="destructive" className="w-full">
            {mutation.error.message}
          </Text>
        )}
      </Stack>
    </form>
  );
}
