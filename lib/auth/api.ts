import { authRequest } from './client';
import type { Account, CurrentUser } from '@/types/auth';
import type {
  ForgotPasswordInput,
  LoginInput,
  ResendVerificationInput,
  SignupInput,
} from '@/schemas/auth.schema';

/**
 * One function per backend auth endpoint. Every path here maps to a route
 * handler under app/api/auth, which forwards to Fastify.
 */
export const authApi = {
  login: (input: LoginInput) => authRequest<{ account: Account }>('/login', input),

  loginWithGoogle: (idToken: string) => authRequest<{ account: Account }>('/google', { idToken }),

  /** Returns only a generic message: the response is identical for an address
   *  that already has an account (anti-enumeration). */
  signup: (input: SignupInput) => authRequest<{ message: string }>('/signup', input),

  logout: () => authRequest<{ message: string }>('/logout', {}),

  me: () => authRequest<CurrentUser>('/me'),

  forgotPassword: (input: ForgotPasswordInput) =>
    authRequest<{ message: string }>('/forgot-password', input),

  resetPassword: (input: { token: string; password: string }) =>
    authRequest<{ message: string }>('/reset-password', input),

  changePassword: (input: { currentPassword?: string; newPassword: string }) =>
    authRequest<{ message: string }>('/change-password', input),

  verifyEmail: (token: string) => authRequest<{ message: string }>('/verify-email', { token }),

  resendVerification: (input: ResendVerificationInput) =>
    authRequest<{ message: string }>('/resend-verification', input),
};

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
};
