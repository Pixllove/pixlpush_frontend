'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Link as MuiLink,
  Stack,
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

export default function LoginForm() {
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
    <Card
      className="auth-card"
      sx={{
        maxWidth: 620,
        mx: 'auto',
        border: '1px solid #eee7f1',
        borderRadius: 4,
        boxShadow: '0 22px 70px rgba(44,16,58,.08)',
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h3" sx={{ fontSize: { xs: 33, md: 42 } }}>
          Welcome back.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Sign in to your PixlPush workspace.
        </Typography>

        <GoogleButton onError={setFormError} />

        <Stack direction="row" alignItems="center" gap={2} sx={{ my: 3 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography fontSize={12} color="text.secondary" whiteSpace="nowrap">
            or continue with email
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Stack>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
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

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontSize={13} fontWeight={700}>
              Password
            </Typography>
            <MuiLink href="/reset-password" fontSize={12} underline="hover">
              Forgot password?
            </MuiLink>
          </Stack>

          <PasswordField
            placeholder="Enter your password"
            autoComplete="current-password"
            fullWidth
            disabled={pending}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
          />

          <SubmitButton
            type="submit"
            variant="contained"
            size="large"
            pending={pending}
            sx={{ mt: 1, py: 1.4 }}
          >
            Log in to PixlPush
          </SubmitButton>
        </Box>

        <Typography textAlign="center" color="text.secondary" fontSize={13} sx={{ mt: 'auto', pt: 3 }}>
          Don&apos;t have an account?{' '}
          <MuiLink href="/get-started" sx={{ color: '#6318bd', fontWeight: 700 }} underline="hover">
            Create a free workspace
          </MuiLink>
        </Typography>
      </CardContent>
    </Card>
  );
}
