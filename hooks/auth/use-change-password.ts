'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, authKeys } from '@/lib/auth/api';
import type { ApiError } from '@/types/auth';

/**
 * Changing the password revokes every other session. The backend hands this
 * caller a replacement, which the route handler stores, so the current tab
 * stays signed in.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, ApiError, { currentPassword: string; newPassword: string }>({
    mutationFn: authApi.changePassword,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}
