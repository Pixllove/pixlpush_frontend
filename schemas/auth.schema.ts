import { z } from 'zod';

/**
 * These mirror pixlpush/src/modules/auth/auth.schema.ts. The backend revalidates
 * everything; matching here only saves a round-trip and keeps messages identical.
 */

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(255);

/** Backend requires 12 characters minimum (length over composition rules). */
const newPassword = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(200, 'Password must be at most 200 characters.');

const token = z.string().min(10).max(500);

export const loginSchema = z.object({
  email,
  // Login only checks non-empty: an existing short password must still work.
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const signupSchema = z.object({
  email,
  password: newPassword,
  name: z.string().trim().min(1).max(120).optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(200),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

/** Google-only accounts: first password, no current password to confirm. */
export const setPasswordSchema = z
  .object({
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({ token });

export const resendVerificationSchema = z.object({ email });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
