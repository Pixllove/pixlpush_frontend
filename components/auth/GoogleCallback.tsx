'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Typography } from '@mui/material';
import LockRounded from '@mui/icons-material/LockRounded';
import AuthShell from '@/components/website/AuthShell';
import { useGoogleLogin } from '@/hooks/auth/use-login';
import { postLoginPath, safeRedirect } from '@/lib/auth/redirect';
import { googleErrorMessage } from './GoogleButton';

/**
 * Where Google sends the user back to. It finishes the sign-in and opens the
 * app; the login, sign-up or invitation page the button was on is only
 * returned to when the sign-in did not happen.
 */
const STEPS = ['Confirming your Google account', 'Securing your session', 'Opening your workspace'];

export default function GoogleCallback() {
  // 0: waiting for Google's answer, 1: creating the session, 2: on the way to the app
  const [step, setStep] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleLogin = useGoogleLogin();

  // The ref stops Strict Mode's double effect from signing in twice.
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const from = safeRedirect(searchParams.get('from'), '/login');
    const backWith = (message?: string) => {
      const separator = from.includes('?') ? '&' : '?';
      router.replace(message ? `${from}${separator}googleError=${encodeURIComponent(message)}` : from);
    };

    (async () => {
      try {
        const { getGoogleRedirectIdToken } = await import('@/lib/auth/firebase');
        const idToken = await getGoogleRedirectIdToken();
        // Opened directly, reloaded, or the chooser was left without picking an account.
        if (!idToken) return backWith();

        setStep(1);
        const { account } = await googleLogin.mutateAsync(idToken);
        setStep(2);
        // Verified addresses go to the app, unverified ones to the verify screen.
        router.replace(postLoginPath(account, searchParams.get('redirect')));
        router.refresh();
      } catch (error) {
        backWith(googleErrorMessage(error));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthShell mode="login">
      <div className="auth-signin" style={{ '--auth-fill': [0.3, 0.65, 1][step], '--auth-progress': step / (STEPS.length - 1) } as React.CSSProperties}>
        {/* The mark inside a ring that fills as the three steps complete. */}
        <div className={`auth-signin-ring${step === STEPS.length - 1 ? ' done' : ''}`} aria-hidden>
          <svg viewBox="0 0 88 88">
            <circle className="auth-signin-track" cx="44" cy="44" r="42" />
            <circle className="auth-signin-arc" cx="44" cy="44" r="42" />
          </svg>
          <span className="auth-signin-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/site-icon.png" alt="" />
          </span>
        </div>

        <Typography component="h1" variant="h1">Signing you in</Typography>
        {/* Keyed so each new step label fades in; this line alone is announced, once per change. */}
        <p className="auth-signin-now" role="status" aria-live="polite"><span key={step}>{STEPS[step]}</span></p>

        <ol className="auth-signin-steps">
          {STEPS.map((label, index) => (
            <li key={label} className={index < step ? 'done' : index === step ? 'current' : ''} aria-current={index === step ? 'step' : undefined}>
              <span className="auth-signin-dot" aria-hidden>
                {index < step && <svg viewBox="0 0 20 20"><path d="M5.5 10.5l3 3 6-7" /></svg>}
              </span>
              {label}
            </li>
          ))}
        </ol>

        <p className="auth-signin-note"><LockRounded />Secured with Google sign-in</p>
      </div>
    </AuthShell>
  );
}
