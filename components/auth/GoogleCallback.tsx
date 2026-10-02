'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { useGoogleLogin } from '@/hooks/auth/use-login';
import { postLoginPath, safeRedirect } from '@/lib/auth/redirect';
import { googleErrorMessage } from './GoogleButton';

/**
 * Where Google sends the user back to. It finishes the sign-in and opens the
 * app; the login, sign-up or invitation page the button was on is only
 * returned to when the sign-in did not happen.
 */
const spin = keyframes({ to: { transform: 'rotate(360deg)' } });
const breathe = keyframes({ '0%, 100%': { transform: 'scale(1)', opacity: 0.55 }, '50%': { transform: 'scale(1.12)', opacity: 0.9 } });
const rise = keyframes({ from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } });
const pulse = keyframes({ '0%, 100%': { opacity: 0.35 }, '50%': { opacity: 1 } });

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
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        px: 2,
        bgcolor: '#fffaf8',
        '@media (prefers-reduced-motion: reduce)': { '& *': { animation: 'none !important' } },
      }}
    >
      {/* Brand glow: the same warm orange and violet as the marketing pages, kept soft. */}
      <Box aria-hidden sx={{ position: 'absolute', width: 520, height: 520, top: -180, right: -140, borderRadius: '50%', background: 'radial-gradient(circle closest-side, rgba(255,120,80,.38), rgba(255,90,44,0))', animation: `${breathe} 9s ease-in-out infinite` }} />
      <Box aria-hidden sx={{ position: 'absolute', width: 460, height: 460, bottom: -170, left: -130, borderRadius: '50%', background: 'radial-gradient(circle closest-side, rgba(140,70,240,.32), rgba(85,23,184,0))', animation: `${breathe} 11s ease-in-out infinite reverse` }} />

      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: 'relative',
          width: 'min(100%, 400px)',
          p: { xs: 3.5, sm: 5 },
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(85,23,184,.10)',
          bgcolor: 'rgba(255,255,255,.82)',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 30px 80px rgba(61,12,107,.14), 0 2px 6px rgba(61,12,107,.05)',
          animation: `${rise} .45s ease-out both`,
        }}
      >
        {/* The mark sits inside a ring that draws itself round: progress without a generic spinner. */}
        <Box sx={{ position: 'relative', width: 92, height: 92, mx: 'auto' }}>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, rgba(85,23,184,0) 0deg, #5517B8 210deg, #FF5A2C 330deg, rgba(255,90,44,0) 360deg)', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))', animation: `${spin} 1.4s linear infinite` }} />
          <Box sx={{ position: 'absolute', inset: 9, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#fff', boxShadow: '0 8px 22px rgba(61,12,107,.14)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/site-icon.png" alt="" width={44} height={44} style={{ borderRadius: 10 }} />
          </Box>
        </Box>

        <Typography component="h1" sx={{ mt: 3.5, fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', color: '#241536' }}>
          Signing you in
        </Typography>
        <Typography sx={{ mt: 1, fontSize: 14, lineHeight: 1.6, color: '#706878' }}>
          One moment while we set up your secure session.
        </Typography>

        <Box component="ol" sx={{ m: 0, mt: 3.5, p: 0, listStyle: 'none', display: 'grid', gap: 1.25, textAlign: 'left' }}>
          {STEPS.map((label, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <Box
                component="li"
                key={label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.75,
                  py: 1.25,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: current ? 'rgba(85,23,184,.22)' : 'transparent',
                  bgcolor: current ? 'rgba(85,23,184,.05)' : 'transparent',
                  transition: 'background-color .25s, border-color .25s',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    color: '#fff',
                    bgcolor: done ? '#1d9854' : current ? '#5517B8' : '#e6dfee',
                    transition: 'background-color .25s',
                    '& svg': { fontSize: 15 },
                  }}
                >
                  {done ? <CheckRounded /> : <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: current ? '#fff' : '#b9aec6', animation: current ? `${pulse} 1.1s ease-in-out infinite` : 'none' }} />}
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: current ? 700 : 500, color: done || current ? '#241536' : '#9a90a6' }}>
                  {label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Typography sx={{ mt: 3.5, fontSize: 12, color: '#9a90a6' }}>
          Protected by Google sign-in
        </Typography>
      </Box>
    </Box>
  );
}
