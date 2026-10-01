'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi, authKeys } from '@/lib/auth/api';
import { isPermanentAuthError } from '@/lib/auth/client';
import type { CurrentUser } from '@/types/auth';

/**
 * The backend session is the source of truth for "am I signed in": this asks
 * the server rather than inspecting any client-side value.
 */
export function useCurrentUser() {
  const query = useQuery<CurrentUser>({
    queryKey: authKeys.currentUser(),
    queryFn: authApi.me,
    retry: (failureCount, error) => !isPermanentAuthError(error) && failureCount < 2,
    // Identity rarely changes, and whatever changes it invalidates this key.
    // Past this it is shown from cache and re-checked in the background.
    staleTime: 5 * 60_000,
  });

  return {
    ...query,
    account: query.data?.account,
    projects: query.data?.projects ?? [],
    isAuthenticated: query.isSuccess && Boolean(query.data?.account),
  };
}
