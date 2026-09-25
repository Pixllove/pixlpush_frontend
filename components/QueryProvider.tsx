'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isPermanentAuthError } from '@/lib/auth/client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created in state so each browser session gets exactly one client, and it is
  // never shared across requests during SSR.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Retrying a 401 just delays the redirect to login.
            retry: (failureCount, error) => !isPermanentAuthError(error) && failureCount < 2,
            // Auth state must not go stale silently: re-check when the user
            // returns to the tab, so a revoked or expired session surfaces.
            refetchOnWindowFocus: true,
            staleTime: 30_000,
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
