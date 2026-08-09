'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export const sessionQueryKey = ['session'] as const;

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async () => {
      const result = await apiClient.auth.session();
      return result.status === 200 ? result.body : null;
    },
    retry: false,
  });
}
