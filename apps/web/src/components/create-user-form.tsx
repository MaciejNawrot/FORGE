'use client';

import { createUserInputSchema } from '@acme/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { apiClient } from '@/lib/api-client';

type FormValues = z.infer<typeof createUserInputSchema>;

export function CreateUserForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(createUserInputSchema) });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const result = await apiClient.users.create({ body: values });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: () => {
      reset();
      // The users list above is server-rendered; re-run the Server
      // Component to pick up the newly created row.
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">Name</span>
        <input className="border-border rounded-md border px-3 py-2" {...register('name')} />
        {errors.name && <span className="text-destructive text-sm">{errors.name.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Email</span>
        <input
          type="email"
          className="border-border rounded-md border px-3 py-2"
          {...register('email')}
        />
        {errors.email && <span className="text-destructive text-sm">{errors.email.message}</span>}
      </label>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground rounded-md px-3 py-2"
      >
        {mutation.isPending ? 'Adding…' : 'Add user'}
      </button>
      {mutation.isError && (
        <p className="text-destructive w-full text-sm">{mutation.error.message}</p>
      )}
    </form>
  );
}
