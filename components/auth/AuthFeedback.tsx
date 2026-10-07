'use client';

import type { ComponentProps } from 'react';
import { Alert, Box, Slide, Snackbar, Stack, Typography } from '@mui/material';

function ToastTransition(props: ComponentProps<typeof Slide>) {
  return <Slide {...props} direction="left" />;
}

/** Inline error above a form. Only ever shows a normalized, safe message. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert severity="error">
      {message}
    </Alert>
  );
}

/**
 * A waiting, finished or failed step of an auth flow: an icon tile, the page title, then whatever
 * explains it and the one action to take next.
 */
export function AuthStatus({ tone = 'accent', icon, title, children }: {
  tone?: 'accent' | 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Stack className="auth-block" alignItems="flex-start">
      <Box className={`auth-tile ${tone}`} aria-hidden>{icon}</Box>
      <Typography component="h1" variant="h1">{title}</Typography>
      {children}
    </Stack>
  );
}

export function Toast({
  message,
  severity = 'success',
  onClose,
}: {
  message: string | null;
  severity?: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      TransitionComponent={ToastTransition}
      sx={{ top: { xs: 16, sm: 88 }, right: { xs: 16, sm: 28 } }}
    >
      <Alert severity={severity} onClose={onClose} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  );
}
