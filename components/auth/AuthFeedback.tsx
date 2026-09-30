'use client';

import type { ComponentProps } from 'react';
import { Alert, Slide, Snackbar } from '@mui/material';

function ToastTransition(props: ComponentProps<typeof Slide>) {
  return <Slide {...props} direction="left" />;
}

/** Inline error above a form. Only ever shows a normalized, safe message. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert severity="error" sx={{ mb: 1 }}>
      {message}
    </Alert>
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
