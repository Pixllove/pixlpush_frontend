'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, SvgIcon } from '@mui/material';
import type { ApiError } from '@/types/auth';

/** A message a person can act on, for a failed Google sign-in. */
export function googleErrorMessage(error: unknown): string {
  // Firebase's own message for this one is opaque; name the actual fix.
  if ((error as { code?: string }).code === 'auth/unauthorized-domain') {
    return `Google sign-in is not enabled for ${window.location.hostname}. Add that hostname under Firebase > Authentication > Settings > Authorized domains.`;
  }
  return (error as ApiError).message ?? 'Google sign-in failed. Please try again.';
}

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

export default function GoogleButton({
  label = 'Continue with Google',
  onError,
  redirect,
}: {
  label?: string;
  onError: (message: string) => void;
  /** Where to land after sign-in; defaults to the page's ?redirect=. */
  redirect?: string;
}) {
  const searchParams = useSearchParams();
  const leaving = useRef(false);

  // Sign-in was abandoned or failed on the callback page, which sent the user back here with the reason.
  const reported = useRef(false);
  useEffect(() => {
    const message = searchParams.get('googleError');
    if (!message || reported.current) return;
    reported.current = true;
    onError(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = async () => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      const { startGoogleRedirect, isGoogleSignInConfigured } = await import('@/lib/auth/firebase');
      if (!isGoogleSignInConfigured) {
        onError('Google sign-in is not configured.');
        return;
      }
      // This tab goes to Google's account chooser. It comes back to the callback page, which finishes the
      // sign-in and opens the app, so this page is not shown again.
      await startGoogleRedirect(redirect ?? searchParams.get('redirect'), window.location.pathname + window.location.search);
    } catch (error) {
      onError(googleErrorMessage(error));
    } finally {
      leaving.current = false;
    }
  };

  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={<GoogleIcon />}
      onClick={handleClick}
      size="large"
    >
      {label}
    </Button>
  );
}
