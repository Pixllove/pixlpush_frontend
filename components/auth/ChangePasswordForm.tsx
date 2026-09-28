'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import { changePasswordSchema, setPasswordSchema, type ChangePasswordInput } from '@/schemas/auth.schema';
import { useChangePassword } from '@/hooks/auth/use-change-password';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { applyApiError } from '@/lib/auth/form';
import { FormError } from './AuthFeedback';
import PasswordField from './PasswordField';
import SubmitButton from './SubmitButton';

/**
 * "Change password" for accounts with a password; "Set a password" for
 * Google-only accounts, which have no current password to confirm.
 */
export default function ChangePasswordForm() {
  const { account, isLoading } = useCurrentUser();
  // Lives here: setting a first password flips hasPassword and remounts the form.
  const [done, setDone] = useState<'changed' | 'set' | null>(null);

  if (isLoading || !account) {
    return (
      <Card className="saas-card" sx={{ maxWidth: 560 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 2 }}>
          <Skeleton width={180} height={32} />
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
        </CardContent>
      </Card>
    );
  }

  // Remount when the account gains a password, so the form switches mode cleanly.
  const hasPassword = account.hasPassword !== false;
  return <PasswordForm key={String(hasPassword)} hasPassword={hasPassword} done={done} setDone={setDone} />;
}

function PasswordForm({ hasPassword, done, setDone }: {
  hasPassword: boolean;
  done: 'changed' | 'set' | null;
  setDone: (value: 'changed' | 'set' | null) => void;
}) {
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(hasPassword ? changePasswordSchema : setPasswordSchema) as never,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    setDone(null);
    try {
      await changePassword.mutateAsync({
        ...(hasPassword ? { currentPassword: values.currentPassword } : {}),
        newPassword: values.newPassword,
      });
      // Clear immediately so the entered passwords do not sit in the DOM.
      reset();
      setDone(hasPassword ? 'changed' : 'set');
    } catch (error) {
      setFormError(applyApiError(error as never, setError));
    }
  });

  const pending = isSubmitting || changePassword.isPending;

  return (
    <Card className="saas-card" sx={{ maxWidth: 560 }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h3">{hasPassword ? 'Change password' : 'Set a password'}</Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
          {hasPassword
            ? 'Changing your password signs you out of every other device.'
            : 'You sign in with Google. Add a password to also sign in with your email address.'}
        </Typography>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 3, display: 'grid', gap: 2 }}>
          <FormError message={formError} />
          {done === 'changed' && <Alert severity="success">Password updated. Other sessions have been signed out.</Alert>}
          {done === 'set' && <Alert severity="success">Password set. You can now sign in with Google or with your email and password.</Alert>}

          {hasPassword && (
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              fullWidth
              disabled={pending}
              error={Boolean(errors.currentPassword)}
              helperText={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
          )}

          <PasswordField
            label="New password"
            autoComplete="new-password"
            fullWidth
            disabled={pending}
            error={Boolean(errors.newPassword)}
            helperText={errors.newPassword?.message ?? 'At least 12 characters.'}
            {...register('newPassword')}
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

          <SubmitButton type="submit" variant="contained" size="large" pending={pending}>
            {hasPassword ? 'Update password' : 'Set password'}
          </SubmitButton>
        </Box>
      </CardContent>
    </Card>
  );
}
