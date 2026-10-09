'use client';

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { z } from 'zod';
import { createSendingDomain } from '@/lib/sending-domains/api';
import { domainErrorMessage } from '@/lib/sending-domains/errors';
import type { SendingDomain } from '@/types/sending-domain';

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;
const email = z.string().trim().email();

/** The domain part of a valid sender address, or null. */
export function domainFromEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!email.safeParse(trimmed).success) return null;
  const domain = trimmed.split('@')[1] ?? '';
  return DOMAIN_RE.test(domain) ? domain : null;
}

interface Props {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (domain: SendingDomain) => void;
}

export default function AddDomainDialog({ open, projectId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ senderEmail: '' });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const domain = domainFromEmail(form.senderEmail);
  const emailError = touched && !domain ? 'Enter a valid email address, for example sender@example.com.' : null;
  const close = () => {
    setForm({ senderEmail: '' });
    setTouched(false);
    setError(null);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!domain) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createSendingDomain(projectId, {
        senderEmail: form.senderEmail.trim(),
      });
      setForm({ senderEmail: '' });
      setTouched(false);
      onCreated(created);
    } catch (e) {
      setError(domainErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>Add a sending domain</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary" fontSize={13}>Enter the address you want to send from. We will set up its domain.</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Sender email"
              placeholder="sender@example.com"
              value={form.senderEmail}
              onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
              onBlur={() => setTouched(true)}
              error={Boolean(emailError)}
              helperText={emailError ?? (domain ? `Domain: ${domain}` : ' ')}
              required
              autoFocus
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Adding…' : 'Add domain'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
