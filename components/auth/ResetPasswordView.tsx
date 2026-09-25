'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from '@mui/material';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/schemas/auth.schema';
import { useForgotPassword, useResetPassword } from '@/hooks/auth/use-password-reset';
import { applyApiError } from '@/lib/auth/form';
import { FormError } from './AuthFeedback';
import PasswordField from './PasswordField';
import SubmitButton from './SubmitButton';

const cardSx = {
  maxWidth: 620,
  mx: 'auto',
  border: '1px solid #eee7f1',
  borderRadius: 4,
  boxShadow: '0 22px 70px rgba(44,16,58,.08)',
} as const;

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
      <Card className="auth-card" sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 } }}>
            Check your email.
          </Typography>
          <Alert severity="success" sx={{ mt: 3 }}>
            If an account exists for that email, a password reset link has been sent.
          </Alert>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 2 }}>
            The link expires in 30 minutes and can be used once.
          </Typography>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button href="/login">Back to login</Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="auth-card" sx={cardSx}>
      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 } }}>
          Reset your password.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          Enter your Account email and we&apos;ll send a secure reset link.
        </Typography>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 4 }}>
          <FormError message={formError} />
          <TextField
            label="Work email"
            type="email"
            autoComplete="email"
            fullWidth
            disabled={pending}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register('email')}
          />
          <SubmitButton type="submit" fullWidth variant="contained" size="large" pending={pending} sx={{ mt: 2 }}>
            Send reset link
          </SubmitButton>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button href="/login">Back to login</Button>
        </Box>
      </CardContent>
    </Card>
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
      <Card className="auth-card" sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 } }}>
            Password updated.
          </Typography>
          <Alert severity="success" sx={{ mt: 3 }}>
            You can now sign in with your new password.
          </Alert>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button href="/login" variant="contained">
              Continue to login
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="auth-card" sx={cardSx}>
      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 } }}>
          Choose a new password.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          This reset link can be used once and expires 30 minutes after it was sent.
        </Typography>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 4, display: 'grid', gap: 2 }}>
          <FormError message={formError} />
          <input type="hidden" {...register('token')} />

          <PasswordField
            label="New password"
            autoComplete="new-password"
            fullWidth
            disabled={pending}
            error={Boolean(errors.password)}
            helperText={errors.password?.message ?? 'At least 12 characters.'}
            {...register('password')}
          />

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
            Update password
          </SubmitButton>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button href="/login">Back to login</Button>
        </Box>
      </CardContent>
    </Card>
  );
}
