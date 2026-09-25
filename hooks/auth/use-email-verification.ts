'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/auth/api';
import type { ApiError } from '@/types/auth';
import type { ResendVerificationInput } from '@/schemas/auth.schema';

export function useVerifyEmail() {
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: authApi.verifyEmail,
  });
}

export function useResendVerification() {
  return useMutation<{ message: string }, ApiError, ResendVerificationInput>({
    mutationFn: authApi.resendVerification,
  });
}
