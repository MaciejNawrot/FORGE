import { notFound } from 'next/navigation';
import { ExerciseDetail } from '@/features/exercises';
import { getServerApiClient } from '@/shared/api/api-server';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function ExerciseDetailPage({ params }: PageProps<'/exercises/[id]'>) {
  const dict = await getServerDictionary();
  const { id } = await params;
  const apiClient = await getServerApiClient();
  const result = await apiClient.exercises.getExercise({ params: { id } });

  if (result.status !== 200) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <ExerciseDetail exercise={result.body} dict={dict} />
    </main>
  );
}
