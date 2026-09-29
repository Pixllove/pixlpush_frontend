'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, CircularProgress, SvgIcon } from '@mui/material';
import { useGoogleLogin } from '@/hooks/auth/use-login';
import { postLoginPath } from '@/lib/auth/redirect';
import type { ApiError } from '@/types/auth';

// The multicolour "G" from Google's brand guidelines; the MUI icon is monochrome.
function GoogleIcon() {
  return (
    <SvgIcon viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </SvgIcon>
  );
}

const REDIRECT_FLAG = 'pixlpush:google-redirect';

export default function GoogleButton({
  label = 'Continue with Google',
  onError,
}: {
  label?: string;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleLogin = useGoogleLogin();
  const [popupPending, setPopupPending] = useState(false);

  const pending = popupPending || googleLogin.isPending;

  const reportError = (error: unknown) => {
    const code = (error as { code?: string }).code;
    // Firebase's own message for this one is opaque; name the actual fix.
    if (code === 'auth/unauthorized-domain') {
      onError(
        `Google sign-in is not enabled for ${window.location.hostname}. Add that hostname under Firebase > Authentication > Settings > Authorized domains.`,
      );
      return;
    }
    onError((error as ApiError).message ?? 'Google sign-in failed. Please try again.');
  };

  // Coming back from Google's account chooser: finish the sign-in here.
  // The ref stops Strict Mode's double effect from logging in twice.
  const handledRedirect = useRef(false);
  useEffect(() => {
    if (handledRedirect.current) return;
    handledRedirect.current = true;

    // Only a page load that follows our own redirect has a result to collect;
    // any other load (a plain reload) leaves the button idle.
    if (sessionStorage.getItem(REDIRECT_FLAG) !== '1') return;
    sessionStorage.removeItem(REDIRECT_FLAG);
    setPopupPending(true);

    (async () => {
      const { getGoogleRedirectIdToken } = await import('@/lib/auth/firebase');

      try {
        const idToken = await getGoogleRedirectIdToken();
        if (!idToken) {
          onError('Google sign-in did not complete. Please try again.');
          return;
        }

        const { account } = await googleLogin.mutateAsync(idToken);
        // Verified addresses go to the app, unverified ones to the verify screen.
        router.replace(postLoginPath(account, searchParams.get('redirect')));
        router.refresh();
      } catch (error) {
        reportError(error);
      } finally {
        setPopupPending(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = async () => {
    setPopupPending(true);
    try {
      const { startGoogleRedirect, isGoogleSignInConfigured } = await import('@/lib/auth/firebase');

      if (!isGoogleSignInConfigured) {
        onError('Google sign-in is not configured.');
        setPopupPending(false);
        return;
      }

      sessionStorage.setItem(REDIRECT_FLAG, '1');
      // Navigates this tab away to Google; the spinner stays until it does.
      await startGoogleRedirect();
    } catch (error) {
      sessionStorage.removeItem(REDIRECT_FLAG);
      reportError(error);
      setPopupPending(false);
    }
  };

  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={<GoogleIcon />}
      onClick={handleClick}
      disabled={pending}
      sx={{
        mt: 4,
        py: 1.4,
        borderColor: '#ddd5e5',
        color: '#241536',
        // Disabled would otherwise grey the border and label out from under
        // the spinner, which reads as the button changing shape.
        '&.Mui-disabled': { borderColor: '#ddd5e5', color: '#241536' },
        // Hidden, not unmounted: removing the icon takes its margin with it
        // and shifts the label sideways.
        '& .MuiButton-startIcon': { visibility: pending ? 'hidden' : 'visible' },
      }}
    >
      {/**
       * The label keeps its box while pending: swapping it for the spinner
       * collapses the content width and snaps everything back to centre.
       * It is hidden but still laid out, and the spinner sits on top of it.
       */}
      <Box component="span" sx={{ visibility: pending ? 'hidden' : 'visible' }}>
        {label}
      </Box>

      {pending && (
        <CircularProgress
          size={22}
          color="inherit"
          sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-11px', ml: '-11px' }}
        />
      )}
    </Button>
  );
}
