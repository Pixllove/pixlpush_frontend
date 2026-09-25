'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/auth/api';
import type { ApiError } from '@/types/auth';
import type { ForgotPasswordInput } from '@/schemas/auth.schema';

/** Always resolves with the same generic message, whether or not the email exists. */
export function useForgotPassword() {
  return useMutation<{ message: string }, ApiError, ForgotPasswordInput>({
    mutationFn: authApi.forgotPassword,
  });
}

export function useResetPassword() {
  return useMutation<{ message: string }, ApiError, { token: string; password: string }>({
    mutationFn: authApi.resetPassword,
  });
}
