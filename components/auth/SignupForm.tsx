'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { signupSchema, type SignupInput } from '@/schemas/auth.schema';
import { useSignup } from '@/hooks/auth/use-signup';
import { useClearOnRestore } from '@/hooks/auth/use-clear-on-restore';
import { applyApiError } from '@/lib/auth/form';
import { FormError } from './AuthFeedback';
import GoogleButton from './GoogleButton';
import PasswordField from './PasswordField';
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
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', name: '' },
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
      });

      // Signup establishes no session: the backend emails a verification link.
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      setFormError(applyApiError(error as never, setError));
    }
  });

  const pending = isSubmitting || signup.isPending;

  return (
    <Card
      className="auth-card signup-card"
      sx={{
        maxWidth: 620,
        mx: 'auto',
        border: '1px solid #eee7f1',
        borderRadius: 4,
        boxShadow: '0 22px 70px rgba(44,16,58,.08)',
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 5 }, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h3" sx={{ fontSize: { xs: 33, md: 42 } }}>
          Create your workspace.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 480 }}>
          Set up your PixlPush account and start building your first retention journey.
        </Typography>

        <GoogleButton onError={setFormError} />

        <Stack direction="row" alignItems="center" gap={2} sx={{ my: 2.5 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography fontSize={12} color="text.secondary" whiteSpace="nowrap">
            or sign up with email
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Stack>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 1.5 }}>
          <FormError message={formError} />

          <TextField
            label="Full name"
            autoComplete="name"
            fullWidth
            disabled={pending}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
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

          <PasswordField
            label="Password"
            autoComplete="new-password"
            fullWidth
            disabled={pending}
            error={Boolean(errors.password)}
            helperText={errors.password?.message ?? 'At least 12 characters.'}
            {...register('password')}
          />

          <SubmitButton
            type="submit"
            variant="contained"
            size="large"
            pending={pending}
            sx={{ mt: 0.5, py: 1.3 }}
          >
            Create my free workspace
          </SubmitButton>
        </Box>

        <Typography textAlign="center" color="text.secondary" fontSize={11} lineHeight={1.5} sx={{ mt: 2 }}>
          By creating an account, you agree to our terms and privacy policy. No credit card required.
        </Typography>
        <Typography textAlign="center" color="text.secondary" fontSize={13} sx={{ mt: 1.5 }}>
          Already have an account?{' '}
          <MuiLink href="/login" sx={{ color: '#6318bd', fontWeight: 700 }} underline="hover">
            Log in
          </MuiLink>
        </Typography>
      </CardContent>
    </Card>
  );
}
