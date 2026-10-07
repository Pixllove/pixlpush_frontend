'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Divider,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { signupSchema, type SignupInput } from '@/schemas/auth.schema';
import { useSignup } from '@/hooks/auth/use-signup';
import { useClearOnRestore } from '@/hooks/auth/use-clear-on-restore';
import { applyApiError } from '@/lib/auth/form';
import { FormError } from './AuthFeedback';
import GoogleButton from './GoogleButton';
import PasswordField, { PasswordRule } from './PasswordField';
import SubmitButton from './SubmitButton';

export default function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', name: '', company: '' },
  });

  useClearOnRestore(reset);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await signup.mutateAsync({
        email: values.email,
        password: values.password,
        // The backend takes a single optional name; empty means "not supplied".
        ...(values.name?.trim() ? { name: values.name.trim() } : {}),
        company: values.company.trim(),
      });

      // Signup establishes no session: the backend emails a verification link.
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      setFormError(applyApiError(error as never, setError));
    }
  });

  const pending = isSubmitting || signup.isPending;

  return (
    <Box className="auth-block">
      <Box>
        <Typography component="h1" variant="h1">Create your workspace</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Set up your account and build your first retention journey.</Typography>
      </Box>

      <GoogleButton onError={setFormError} />
      <Divider>or</Divider>

      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
        <FormError message={formError} />

        <TextField
          label="Full name"
          autoComplete="name"
          autoFocus
          fullWidth
          disabled={pending}
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
          {...register('name')}
        />

        <TextField
          label="Company name"
          autoComplete="organization"
          fullWidth
          required
          disabled={pending}
          error={Boolean(errors.company)}
          helperText={errors.company?.message}
          {...register('company')}
        />

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

        <Box sx={{ display: 'grid', gap: 0.75 }}>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            fullWidth
            disabled={pending}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
          />
          <PasswordRule value={watch('password')} />
        </Box>

        <SubmitButton type="submit" variant="contained" size="large" fullWidth pending={pending}>
          Create account
        </SubmitButton>
      </Box>

      <Typography variant="caption" color="text.secondary">
        By creating an account, you agree to our terms and privacy policy. No credit card required.
      </Typography>
      <Typography color="text.secondary">
        Already have an account? <MuiLink href="/login">Log in</MuiLink>
      </Typography>
    </Box>
  );
}
