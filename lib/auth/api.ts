import { authRequest } from './client';
import type { Account, AccountProject, CurrentUser, LoginResult, MfaEnrollment } from '@/types/auth';
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
  login: (input: LoginInput) => authRequest<LoginResult>('/login', input),

  loginWithGoogle: (idToken: string) => authRequest<LoginResult>('/google', { idToken }),

  mfaStatus: () => authRequest<{ enabled: boolean; enabledAt: string | null }>('/mfa/status'),
  startMfaEnrollment: () => authRequest<MfaEnrollment>('/mfa/enrollment/start', {}),
  confirmMfaEnrollment: (code: string) => authRequest<{ recoveryCodes: string[] }>('/mfa/enrollment/confirm', { code }),
  verifyMfaLogin: (input: { method: 'totp' | 'recovery'; code: string }) => authRequest<{ account: Account; recoveryUsed: boolean }>('/mfa/login/verify', input),
  regenerateMfaRecoveryCodes: (currentPassword?: string) => authRequest<{ recoveryCodes: string[] }>('/mfa/recovery-codes/regenerate', { currentPassword }),
  disableMfa: (currentPassword?: string) => authRequest<{ account: Account }>('/mfa/disable', { currentPassword }),

  /** Returns only a generic message: the response is identical for an address
   *  that already has an account (anti-enumeration). */
  signup: (input: SignupInput) => authRequest<{ message: string }>('/signup', input),

  logout: () => authRequest<{ message: string }>('/logout', {}),

  me: () => authRequest<CurrentUser>('/me'),

  skipOnboarding: () => authRequest<{ skipped: boolean }>('/onboarding/skip', {}),

  setActiveProject: (projectId: string) =>
    authRequest<{ activeProjectId: string; project: AccountProject }>(
      '/me/active-project',
      { projectId },
      undefined,
      'PATCH',
    ),

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
