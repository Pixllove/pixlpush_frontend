'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth/api';
import type { ApiError } from '@/types/auth';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<{ message: string }, ApiError, void>({
    mutationFn: authApi.logout,
    onSettled: async () => {
      // Cancel first: an in-flight /me must not land after logout and repaint
      // the UI as authenticated.
      await queryClient.cancelQueries();
      // Everything, not just the auth keys: the next account to sign in on this
      // tab must not be shown the previous one's projects and users.
      queryClient.clear();
      router.replace('/login');
      // Drops any cached RSC payload rendered for the signed-in user.
      router.refresh();
    },
  });
}
