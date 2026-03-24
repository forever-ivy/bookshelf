import { QueryClient } from '@tanstack/react-query';

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: 0,
      },
      queries: {
        gcTime: 1000 * 60 * 30,
        retry: 1,
        staleTime: 1000 * 60,
      },
    },
  });
}
