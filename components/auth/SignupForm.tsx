'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { signupSchema, type SignupFormInput } from '@/schemas/auth.schema';
import { useSignup } from '@/hooks/auth/use-signup';
import { useClearOnRestore } from '@/hooks/auth/use-clear-on-restore';
import { applyApiError } from '@/lib/auth/form';
import { FormError } from './AuthFeedback';
import GoogleButton from './GoogleButton';
import PasswordField, { PasswordRule } from './PasswordField';
import SubmitButton from './SubmitButton';

export default function SignupForm({ active = true, onSwitch }: { active?: boolean; onSwitch?: (mode: 'login' | 'signup') => void }) {
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
  } = useForm<SignupFormInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', name: '', company: '', legalAccepted: false },
  });

  useClearOnRestore(reset);

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(undefined);
      try {
        await signup.mutateAsync({
          email: values.email,
          password: values.password,
          // The backend takes a single optional name; empty means "not supplied".
          ...(values.name?.trim() ? { name: values.name.trim() } : {}),
          ...(values.company?.trim() ? { company: values.company.trim() } : {}),
        });

        // Signup establishes no session: the backend emails a verification link.
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      } catch (error) {
        setFormError(applyApiError(error as never, setError));
      }
    },
    (formErrors) => {
      if (formErrors.legalAccepted) setFormError(formErrors.legalAccepted.message);
    },
  );

  const pending = isSubmitting || signup.isPending;

  return (
    <Box className={`auth-block${active ? ' is-active' : ''}`}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography component="h1" variant="h1">Get Started Today</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Quick setup, no credit card required.</Typography>
      </Box>

      <FormError message={formError} />
      <GoogleButton onError={setFormError} />
      <Divider>or</Divider>

      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
        <TextField
          label="Company name"
          autoComplete="organization"
          autoFocus={active}
          fullWidth
          disabled={pending}
          error={Boolean(errors.company)}
          helperText={errors.company?.message}
          {...register('company')}
        />

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
          label="Email Address"
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

        <FormControlLabel
          control={<Checkbox color="primary" disabled={pending} {...register('legalAccepted')} />}
          label={<>I agree to PixlPush&apos;s <MuiLink href="/legal/terms" target="_blank" rel="noreferrer">Terms of Service</MuiLink> and <MuiLink href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</MuiLink>.</>}
          sx={{ alignItems: 'center', '& .MuiFormControlLabel-label': { fontSize: 12, lineHeight: 1.5 } }}
        />

        <SubmitButton type="submit" variant="contained" size="large" fullWidth pending={pending}>
          Sign up with Email
        </SubmitButton>
      </Box>
      <Typography color="text.secondary">
        Already have an account?         <MuiLink href="/login" onClick={(event) => { if (onSwitch) { event.preventDefault(); onSwitch('login'); } }}>Log in</MuiLink>
      </Typography>
    </Box>
  );
}
