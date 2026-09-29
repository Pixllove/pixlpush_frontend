'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import type { ApiError } from '@/types/auth';

type Phase =
  | { kind: 'working' }
  | { kind: 'create' }
  | { kind: 'login' }
  | { kind: 'error'; message: string };

const MESSAGES: Record<string, string> = {
  INVALID_INVITATION: 'This invitation is invalid or has already been used.',
  INVITATION_EXPIRED: 'This invitation has expired. Ask the project owner to resend it.',
  INVITATION_EMAIL_MISMATCH: 'You are signed in with a different email address than the one invited. Sign out and sign in with the invited address.',
  PROJECT_INACTIVE: 'This project is deactivated.',
  VALIDATION_ERROR: 'Use a password with at least 12 characters.',
};

async function accept(body: object): Promise<{ project: { id: string } }> {
  const res = await fetch('/api/invitations/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  const json = await res.json().catch(() => undefined);
  if (!res.ok) throw { status: res.status, code: json?.error?.code ?? 'UNKNOWN', message: '' } satisfies ApiError;
  return json.data;
}

/**
 * Invitation link target. Tries the current session first; a new address
 * sets a password here, an existing account signs in and comes back.
 */
export default function InvitationAccept() {
  const token = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'working' });
  const [form, setForm] = useState({ name: '', password: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = (projectId: string) => window.location.assign(`/dashboard?project=${encodeURIComponent(projectId)}`);

  useEffect(() => {
    token.current = new URLSearchParams(window.location.search).get('token');
    if (!token.current) {
      setPhase({ kind: 'error', message: MESSAGES.INVALID_INVITATION });
      return;
    }
    accept({ token: token.current })
      .then((data) => done(data.project.id))
      .catch((e: ApiError) => {
        if (e.code === 'PASSWORD_REQUIRED') setPhase({ kind: 'create' });
        else if (e.code === 'LOGIN_REQUIRED' || e.status === 401) setPhase({ kind: 'login' });
        else setPhase({ kind: 'error', message: MESSAGES[e.code] ?? 'Something went wrong. Please try again.' });
      });
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.password.length < 12) {
      setFormError(MESSAGES.VALIDATION_ERROR);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const data = await accept({ token: token.current, password: form.password, ...(form.name.trim() ? { name: form.name.trim() } : {}) });
      done(data.project.id);
    } catch (e) {
      setFormError(MESSAGES[(e as ApiError).code] ?? 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const loginHref = `/login?redirect=${encodeURIComponent(`/invitations/accept?token=${token.current ?? ''}`)}`;

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>Project invitation</Typography>
        {phase.kind === 'working' && (
          <Stack alignItems="center" gap={1.5} sx={{ py: 3 }} role="status">
            <CircularProgress size={28} />
            <Typography color="text.secondary">Checking your invitation…</Typography>
          </Stack>
        )}
        {phase.kind === 'error' && (
          <Stack gap={2}>
            <Alert severity="error">{phase.message}</Alert>
            <Button href="/dashboard" variant="outlined">Go to PixlPush</Button>
          </Stack>
        )}
        {phase.kind === 'login' && (
          <Stack gap={2}>
            <Typography color="text.secondary">This email already has a PixlPush account. Sign in with it to accept the invitation.</Typography>
            <Button href={loginHref} variant="contained">Sign in to accept</Button>
          </Stack>
        )}
        {phase.kind === 'create' && (
          <form onSubmit={create} noValidate>
            <Stack gap={2}>
              <Typography color="text.secondary">Create your PixlPush account to join the project.</Typography>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField label="Your name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
              <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText="At least 12 characters." fullWidth required />
              <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Creating account…' : 'Create account and join'}</Button>
            </Stack>
          </form>
        )}
      </Card>
    </Box>
  );
}
