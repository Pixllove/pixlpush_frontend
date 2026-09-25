'use client';

import { Alert, Snackbar } from '@mui/material';

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
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={severity} onClose={onClose} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  );
}
