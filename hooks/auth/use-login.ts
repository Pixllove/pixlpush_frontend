'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { authApi, authKeys } from '@/lib/auth/api';
import { projectKeys } from '@/lib/projects/api';
import type { Account, ApiError } from '@/types/auth';
import type { LoginInput } from '@/schemas/auth.schema';

/**
 * A session that ended without a logout (expired, cookies cleared) can leave
 * the previous account's projects cached, so they are dropped before the new
 * user is loaded.
 */
async function startSession(queryClient: QueryClient): Promise<void> {
  queryClient.removeQueries({ queryKey: projectKeys.all });
  await queryClient.invalidateQueries({ queryKey: authKeys.all });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<{ account: Account }, ApiError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: async () => {
      // The session cookie is now set; pull the real user from the server
      // rather than trusting the login response as cache state.
      await startSession(queryClient);
    },
  });
}

export function useGoogleLogin() {
  const queryClient = useQueryClient();

  return useMutation<{ account: Account }, ApiError, string>({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: () => startSession(queryClient),
  });
}
