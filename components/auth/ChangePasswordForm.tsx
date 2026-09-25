'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Card, CardContent, Typography } from '@mui/material';
import { changePasswordSchema, type ChangePasswordInput } from '@/schemas/auth.schema';
import { useChangePassword } from '@/hooks/auth/use-change-password';
import { applyApiError } from '@/lib/auth/form';
import { FormError } from './AuthFeedback';
import PasswordField from './PasswordField';
import SubmitButton from './SubmitButton';

export default function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    setDone(false);
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      // Clear immediately so the entered passwords do not sit in the DOM.
      reset();
      setDone(true);
    } catch (error) {
      setFormError(applyApiError(error as never, setError));
    }
  });

  const pending = isSubmitting || changePassword.isPending;

  return (
    <Card className="saas-card" sx={{ maxWidth: 560 }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h3">Change password</Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
          Changing your password signs you out of every other device.
        </Typography>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 3, display: 'grid', gap: 2 }}>
          <FormError message={formError} />
          {done && <Alert severity="success">Password updated. Other sessions have been signed out.</Alert>}

          <PasswordField
            label="Current password"
            autoComplete="current-password"
            fullWidth
            disabled={pending}
            error={Boolean(errors.currentPassword)}
            helperText={errors.currentPassword?.message}
            {...register('currentPassword')}
          />

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
            Update password
          </SubmitButton>
        </Box>
      </CardContent>
    </Card>
  );
}
