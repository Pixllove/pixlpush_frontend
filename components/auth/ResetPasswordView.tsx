'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Link as MuiLink, TextField, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/schemas/auth.schema';
import { useForgotPassword, useResetPassword } from '@/hooks/auth/use-password-reset';
import { applyApiError } from '@/lib/auth/form';
import { AuthStatus, FormError } from './AuthFeedback';
import PasswordField, { PasswordRule } from './PasswordField';
import SubmitButton from './SubmitButton';


/**
 * One route, two modes. The backend emails {FRONTEND_URL}/reset-password?token=,
 * so the same page must both request a link and consume one.
 */
export default function ResetPasswordView() {
  const token = useSearchParams().get('token');
  return token ? <SetNewPassword token={token} /> : <RequestResetLink />;
}

function RequestResetLink() {
  const forgotPassword = useForgotPassword();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await forgotPassword.mutateAsync(values);
      // The backend answers identically whether or not the account exists, and
      // so does this screen: it must not reveal which.
      setSent(true);
    } catch (error) {
      setFormError(applyApiError(error as never, setError));
    }
  });

  const pending = isSubmitting || forgotPassword.isPending;

  if (sent) {
    return (
      <AuthStatus icon={<MarkEmailReadRounded />} title="Check your email">
        <Typography color="text.secondary">
          If an account exists for that email, a password reset link has been sent. The link expires in 30 minutes and can be used once.
        </Typography>
        <Button href="/login" variant="outlined" size="large" fullWidth>Back to login</Button>
      </AuthStatus>
    );
  }

  return (
    <Box className="auth-block">
      <Box>
        <Typography component="h1" variant="h1">Reset your password</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Enter your account email and we&apos;ll send a secure reset link.</Typography>
      </Box>

      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
        <FormError message={formError} />
        <TextField
          label="Work email"
          type="email"
          autoComplete="email"
          autoFocus
          fullWidth
          disabled={pending}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          {...register('email')}
        />
        <SubmitButton type="submit" fullWidth variant="contained" size="large" pending={pending}>
          Send reset link
        </SubmitButton>
      </Box>

      <Typography color="text.secondary">
        Remembered it? <MuiLink href="/login">Back to login</MuiLink>
      </Typography>
    </Box>
  );
}

function SetNewPassword({ token }: { token: string }) {
  const router = useRouter();
  const resetPassword = useResetPassword();
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    // The token is form state only: it is never logged or sent anywhere else.
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await resetPassword.mutateAsync({ token: values.token, password: values.password });
      setDone(true);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (error) {
      setFormError(applyApiError(error as never, setError));
    }
  });

  const pending = isSubmitting || resetPassword.isPending;

  if (done) {
    return (
      <AuthStatus tone="success" icon={<CheckCircleRounded />} title="Password updated">
        <Typography color="text.secondary">You can now log in with your new password.</Typography>
        <Button href="/login" variant="contained" size="large" fullWidth>Continue to login</Button>
      </AuthStatus>
    );
  }

  return (
    <Box className="auth-block">
      <Box>
        <Typography component="h1" variant="h1">Choose a new password</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>This reset link can be used once and expires 30 minutes after it was sent.</Typography>
      </Box>

      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
        <FormError message={formError} />
        <input type="hidden" {...register('token')} />

        <Box sx={{ display: 'grid', gap: 0.75 }}>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            autoFocus
            fullWidth
            disabled={pending}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
          />
          <PasswordRule value={watch('password')} />
        </Box>

        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          fullWidth
          disabled={pending}
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <SubmitButton type="submit" fullWidth variant="contained" size="large" pending={pending}>
          Set new password
        </SubmitButton>
      </Box>

      <Typography color="text.secondary">
        Changed your mind? <MuiLink href="/login">Back to login</MuiLink>
      </Typography>
    </Box>
  );
}
