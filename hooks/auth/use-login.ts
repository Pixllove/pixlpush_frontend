'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, authKeys } from '@/lib/auth/api';
import type { Account, ApiError } from '@/types/auth';
import type { LoginInput } from '@/schemas/auth.schema';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<{ account: Account }, ApiError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: async () => {
      // The session cookie is now set; pull the real user from the server
      // rather than trusting the login response as cache state.
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

export function useGoogleLogin() {
  const queryClient = useQueryClient();

  return useMutation<{ account: Account }, ApiError, string>({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}
