'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import { useResendVerification, useVerifyEmail } from '@/hooks/auth/use-email-verification';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { Toast } from './AuthFeedback';
import SubmitButton from './SubmitButton';
import type { ApiError } from '@/types/auth';

const VERIFIED_KEY = 'pixlpush:email-verified';

const cardSx = {
  maxWidth: 620,
  mx: 'auto',
  border: '1px solid #eee7f1',
  borderRadius: 4,
  boxShadow: '0 22px 70px rgba(44,16,58,.08)',
} as const;

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
        <Card className="auth-card" sx={cardSx}>
          <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            {verifyEmail.isPending && (
              <>
                <CircularProgress />
                <Typography sx={{ mt: 3 }}>Verifying your email…</Typography>
              </>
            )}

            {verifyEmail.isSuccess && (
              <>
                <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 } }}>
                  Email verified.
                </Typography>
                <Alert severity="success" sx={{ mt: 3, textAlign: 'left' }}>
                  Your account is active. You can now sign in.
                </Alert>
                <Button href="/login" variant="contained" sx={{ mt: 3 }}>
                  Continue to login
                </Button>
              </>
            )}

            {verifyEmail.isError && (
              <>
                <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 } }}>
                  Link not valid.
                </Typography>
                <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
                  {(verifyEmail.error as ApiError).message}
                </Alert>
                <Typography color="text.secondary" fontSize={13} sx={{ mt: 2 }}>
                  Verification links expire after 24 hours and can be used once. Request a new one below.
                </Typography>
                <Stack gap={1.5} sx={{ mt: 3 }}>
                  <TextField
                    label="Work email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={resend.isPending}
                    fullWidth
                  />
                  <SubmitButton
                    variant="contained"
                    onClick={handleResend}
                    pending={resend.isPending}
                    disabled={resend.isPending || !email}
                  >
                    Send a new link
                  </SubmitButton>
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
        <Toast message={toast} severity={toastSeverity} onClose={() => setToast(null)} />
      </>
    );
  }

  // --- Arrived straight after signup: tell them to check their inbox. -------
  return (
    <>
      <Card className="auth-card" sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '18px',
              color: '#7132d3',
              bgcolor: '#f0e8ff',
            }}
          >
            <MarkEmailReadRounded />
          </Box>
          <Typography variant="h3" sx={{ mt: 3, fontSize: { xs: 32, md: 42 } }}>
            Verify your email.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
            We sent a verification link to {emailHint || 'your work email'}. Verify it to activate your
            Account and continue to Project setup.
          </Typography>

          <Stack gap={1.5} sx={{ mt: 4 }}>
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
            <Button variant="contained" href="/login">
              I have verified my email
            </Button>
            <SubmitButton
              variant="text"
              onClick={handleResend}
              pending={resend.isPending}
              disabled={resend.isPending || !email}
            >
              Resend verification email
            </SubmitButton>
          </Stack>

          <Typography color="text.secondary" fontSize={12} sx={{ mt: 3 }}>
            The link expires in 24 hours.
          </Typography>
        </CardContent>
      </Card>
      <Toast message={toast} severity={toastSeverity} onClose={() => setToast(null)} />
    </>
  );
}
