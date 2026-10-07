'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import { useResendVerification, useVerifyEmail } from '@/hooks/auth/use-email-verification';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { AuthStatus, Toast } from './AuthFeedback';
import SubmitButton from './SubmitButton';
import type { ApiError } from '@/types/auth';

const VERIFIED_KEY = 'pixlpush:email-verified';


export default function VerifyEmailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailHint = searchParams.get('email') ?? '';

  const verifyEmail = useVerifyEmail();
  const resend = useResendVerification();
  // Undefined when signed out, which is the normal case for a link in an email.
  const { account } = useCurrentUser();

  const [email, setEmail] = useState(emailHint);
  const [toast, setToast] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

  // React 18 StrictMode mounts effects twice in dev; the token is single-use,
  // so a second call would report a valid link as already used.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    verifyEmail.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * Signing in with Google verifies the address, because Google vouches for it.
   * Someone who signed up with a password and then came back through Google is
   * already verified by the time they land here, so asking them to verify again
   * is a dead end. Following a link (?token=) still runs its own flow above.
   */
  useEffect(() => {
    if (token || !account?.emailVerified) return;
    router.replace('/dashboard');
  }, [token, account?.emailVerified, router]);

  // The link usually opens in another tab while this "check your inbox" screen stays open. That tab leaves
  // a note when the address is verified, and this one moves on to the login page as soon as it sees it.
  useEffect(() => {
    if (!token || !verifyEmail.isSuccess) return;
    try { localStorage.setItem(VERIFIED_KEY, String(Date.now())); } catch { /* private mode: the other tab keeps its button */ }
  }, [token, verifyEmail.isSuccess]);
  useEffect(() => {
    if (token) return;
    const onVerified = (event: StorageEvent) => { if (event.key === VERIFIED_KEY && event.newValue) router.replace('/login'); };
    window.addEventListener('storage', onVerified);
    return () => window.removeEventListener('storage', onVerified);
  }, [token, router]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastSeverity(severity);
    setToast(message);
  };

  const handleResend = async () => {
    try {
      await resend.mutateAsync({ email });
      // Same message regardless of whether the address is known or pending.
      notify('If verification is pending, a new link has been sent.');
    } catch (error) {
      notify((error as ApiError).message, 'error');
    }
  };

  // --- Arrived from an email link: show the verification outcome. -----------
  if (token) {
    return (
      <>
        {verifyEmail.isPending && (
          <Stack className="auth-block" alignItems="flex-start" role="status">
            <CircularProgress size={24} />
            <Typography component="h1" variant="h1">Verifying your email…</Typography>
          </Stack>
        )}

        {verifyEmail.isSuccess && (
          <AuthStatus tone="success" icon={<CheckCircleRounded />} title="Email verified">
            <Typography color="text.secondary">Your account is active. You can now log in.</Typography>
            <Button href="/login" variant="contained" size="large" fullWidth>Continue to login</Button>
          </AuthStatus>
        )}

        {verifyEmail.isError && (
          <AuthStatus tone="warning" icon={<ErrorOutlineRounded />} title="This link is not valid">
            <Alert severity="error" sx={{ width: '100%' }}>{(verifyEmail.error as ApiError).message}</Alert>
            <Typography color="text.secondary">
              Verification links expire after 24 hours and can be used once. Request a new one below.
            </Typography>
            <TextField
              label="Work email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={resend.isPending}
              fullWidth
            />
            <SubmitButton variant="contained" size="large" fullWidth onClick={handleResend} pending={resend.isPending} disabled={resend.isPending || !email}>
              Send a new link
            </SubmitButton>
          </AuthStatus>
        )}
        <Toast message={toast} severity={toastSeverity} onClose={() => setToast(null)} />
      </>
    );
  }

  // --- Arrived straight after signup: tell them to check their inbox. -------
  return (
    <>
      <AuthStatus icon={<MarkEmailReadRounded />} title="Check your inbox">
        <Typography color="text.secondary">
          We sent a verification link to{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{emailHint || 'your work email'}</Box>.
          Open it to activate your account. The link expires in 24 hours.
        </Typography>
        {!emailHint && (
          <TextField
            label="Work email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={resend.isPending}
            fullWidth
          />
        )}
        <Button variant="contained" size="large" fullWidth href="/login">
          I have verified my email
        </Button>
        <SubmitButton variant="outlined" size="large" fullWidth onClick={handleResend} pending={resend.isPending} disabled={resend.isPending || !email}>
          Resend email
        </SubmitButton>
        <Typography color="text.secondary">
          Wrong address? <MuiLink href="/get-started">Use a different email</MuiLink>
        </Typography>
      </AuthStatus>
      <Toast message={toast} severity={toastSeverity} onClose={() => setToast(null)} />
    </>
  );
}
