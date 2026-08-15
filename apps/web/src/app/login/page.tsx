'use client';

import { loginInputSchema, registerInputSchema } from '@acme/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useLocale } from '@/lib/i18n/context';
import { sessionQueryKey } from '@/lib/use-session';
import { apiClient } from '@/shared/api';

type LoginFormValues = z.infer<typeof loginInputSchema>;
type RegisterFormValues = z.infer<typeof registerInputSchema>;

export default function LoginPage() {
  const { dict } = useLocale();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <main className="mx-auto max-w-sm p-6">
      <div className="mb-6 flex gap-4">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-semibold' : 'text-muted-foreground'}
        >
          {dict.common.logIn}
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'font-semibold' : 'text-muted-foreground'}
        >
          {dict.login.register}
        </button>
      </div>
      {mode === 'login' ? <LoginForm /> : <RegisterForm />}
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const { dict } = useLocale();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginInputSchema) });

  const mutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const result = await apiClient.auth.login({ body: values });
      if (result.status !== 200) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      router.push('/users');
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">{dict.common.email}</span>
        <input
          type="email"
          className="border-border rounded-md border px-3 py-2"
          {...register('email')}
        />
        {errors.email && <span className="text-destructive text-sm">{errors.email.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">{dict.common.password}</span>
        <input
          type="password"
          className="border-border rounded-md border px-3 py-2"
          {...register('password')}
        />
        {errors.password && (
          <span className="text-destructive text-sm">{errors.password.message}</span>
        )}
      </label>
      {mutation.isError && <p className="text-destructive text-sm">{mutation.error.message}</p>}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground rounded-md px-3 py-2"
      >
        {mutation.isPending ? dict.login.loggingIn : dict.common.logIn}
      </button>
    </form>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { dict } = useLocale();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerInputSchema) });

  const mutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const result = await apiClient.auth.register({ body: values });
      if (result.status !== 201) throw new Error(result.body.message);
      return result.body;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      router.push('/users');
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">{dict.common.personName}</span>
        <input className="border-border rounded-md border px-3 py-2" {...register('name')} />
        {errors.name && <span className="text-destructive text-sm">{errors.name.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">{dict.common.email}</span>
        <input
          type="email"
          className="border-border rounded-md border px-3 py-2"
          {...register('email')}
        />
        {errors.email && <span className="text-destructive text-sm">{errors.email.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">{dict.common.password}</span>
        <input
          type="password"
          className="border-border rounded-md border px-3 py-2"
          {...register('password')}
        />
        {errors.password && (
          <span className="text-destructive text-sm">{errors.password.message}</span>
        )}
      </label>
      {mutation.isError && <p className="text-destructive text-sm">{mutation.error.message}</p>}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground rounded-md px-3 py-2"
      >
        {mutation.isPending ? dict.login.creatingAccount : dict.login.register}
      </button>
    </form>
  );
}
