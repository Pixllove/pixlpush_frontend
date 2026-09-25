'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/auth/api';
import type { ApiError } from '@/types/auth';
import type { SignupInput } from '@/schemas/auth.schema';

/**
 * Signup creates no session and reveals nothing: the response is the same
 * whether or not the address was already registered. The caller always sends
 * the user to /verify-email.
 */
export function useSignup() {
  return useMutation<{ message: string }, ApiError, SignupInput>({
    mutationFn: authApi.signup,
  });
}
