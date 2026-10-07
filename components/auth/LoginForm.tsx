'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Divider,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { loginSchema, type LoginInput } from '@/schemas/auth.schema';
import { useLogin } from '@/hooks/auth/use-login';
import { useClearOnRestore } from '@/hooks/auth/use-clear-on-restore';
import { applyApiError } from '@/lib/auth/form';
import { postLoginPath } from '@/lib/auth/redirect';
import { FormError } from './AuthFeedback';
import GoogleButton from './GoogleButton';
import PasswordField from './PasswordField';
import SubmitButton from './SubmitButton';

export default function LoginForm({ active = true, onSwitch }: { active?: boolean; onSwitch?: (mode: 'login' | 'signup') => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useClearOnRestore(reset);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      const { account } = await login.mutateAsync(values);
      router.replace(postLoginPath(account, searchParams.get('redirect')));
      router.refresh();
    } catch (error) {
      setFormError(applyApiError(error as never, setError));
    }
  });

  // One flag for every disabled/pending state, so a double click cannot fire
  // two logins.
  const pending = isSubmitting || login.isPending;

  return (
    <Box className={`auth-block${active ? ' is-active' : ''}`}>
      <Box>
        <Typography component="h1" variant="h1">Welcome back</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Log in to your PixlPush workspace.</Typography>
      </Box>

      <GoogleButton onError={setFormError} />
      <Divider>or</Divider>

      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
        <FormError message={formError} />

        <TextField
          label="Work email"
          type="email"
          autoComplete="email"
          autoFocus={active}
          fullWidth
          disabled={pending}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          {...register('email')}
        />

        <PasswordField
          label="Password"
          autoComplete="current-password"
          fullWidth
          disabled={pending}
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
          {...register('password')}
        />
        <MuiLink href="/reset-password" variant="body2" sx={{ justifySelf: 'end', mt: -1 }}>
          Forgot password?
        </MuiLink>

        <SubmitButton type="submit" variant="contained" size="large" fullWidth pending={pending}>
          Log in
        </SubmitButton>
      </Box>

      <Typography color="text.secondary">
        New to PixlPush?         <MuiLink href="/get-started" onClick={(event) => { if (onSwitch) { event.preventDefault(); onSwitch('signup'); } }}>Create an account</MuiLink>
      </Typography>
    </Box>
  );
}
