'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Link as MuiLink, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { authApi, authKeys } from '@/lib/auth/api';
import { projectKeys } from '@/lib/projects/api';
import type { ApiError } from '@/types/auth';
import { postLoginPath } from '@/lib/auth/redirect';
import { onboardingNeedsResume, readOnboardingState } from '@/lib/onboarding';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormError } from './AuthFeedback';
import SubmitButton from './SubmitButton';

export default function MfaLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string>();
  const verify = useMutation({ mutationFn: authApi.verifyMfaLogin });
  const pending = verify.isPending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    try {
      const result = await verify.mutateAsync({ method, code: code.trim() });
      queryClient.removeQueries({ queryKey: projectKeys.all });
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      if (result.recoveryUsed) {
        setFormError('A recovery code was used. After signing in, generate a new set if you have fewer codes than expected.');
      }
      const destination = postLoginPath(result.account, searchParams.get('redirect'));
      router.replace(destination === '/dashboard/onboarding' && onboardingNeedsResume(readOnboardingState()) ? '/onboarding' : destination);
      router.refresh();
    } catch (error) {
      setFormError((error as ApiError)?.message ?? 'The verification code could not be accepted.');
    }
  };

  return (
    <Box className="auth-block is-active">
      <Box>
        <Typography component="h1" variant="h1">Verify your sign-in</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Enter the code from your authenticator app to continue to PixlPush.
        </Typography>
      </Box>

      <ToggleButtonGroup
        exclusive
        fullWidth
        value={method}
        onChange={(_, next: 'totp' | 'recovery' | null) => next && setMethod(next)}
        aria-label="Verification method"
        disabled={pending}
      >
        <ToggleButton value="totp">Authenticator app</ToggleButton>
        <ToggleButton value="recovery">Recovery code</ToggleButton>
      </ToggleButtonGroup>

      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
        <FormError message={formError} />
        <TextField
          label={method === 'totp' ? '6-digit verification code' : 'Recovery code'}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          inputMode={method === 'totp' ? 'numeric' : 'text'}
          autoFocus
          fullWidth
          disabled={pending}
          helperText={method === 'totp' ? 'Codes refresh every 30 seconds.' : 'Each recovery code can be used once.'}
        />
        <SubmitButton type="submit" variant="contained" size="large" fullWidth pending={pending} disabled={!code.trim()}>
          Verify and continue
        </SubmitButton>
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Button href="/login" size="small" disabled={pending}>Start over</Button>
        <MuiLink href="/login" variant="body2">Use another account</MuiLink>
      </Stack>
    </Box>
  );
}
