'use client';

import { useEffect, useState } from 'react';
import { EmailRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useEmailSettings } from '@/hooks/projects/use-project-settings';
import SettingsStatus from './SettingsStatus';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];
const STATUS = {
  not_configured: ['Not configured', 'neutral'],
  pending_verification: ['Pending verification', 'warning'],
  verified: ['Verified', 'success'],
  error: ['Error', 'warning'],
} as const;

/** Sending domain / sender identity of the active Project. */
export default function EmailPanel() {
  const { active } = useActiveProject();
  const { query, configure, verify } = useEmailSettings(active?.id);
  const config = query.data;
  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));

  const [form, setForm] = useState({ sendingDomain: '', senderEmail: '', senderName: '' });
  const [error, setError] = useState<string>();

  // Refill when the Project (or its saved config) changes.
  useEffect(() => {
    setForm({ sendingDomain: config?.sendingDomain ?? '', senderEmail: config?.senderEmail ?? '', senderName: config?.senderName ?? '' });
    setError(undefined);
  }, [config]);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
    disabled: !canEdit,
    fullWidth: true,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    try { await configure.mutateAsync(form); } catch (cause) { setError((cause as ApiError).message ?? 'Could not save.'); }
  };

  const check = async () => {
    setError(undefined);
    try { await verify.mutateAsync(); } catch (cause) { setError((cause as ApiError).message); }
  };

  const [label, tone] = STATUS[config?.status ?? 'not_configured'];

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Email sending</Typography>
        <Typography color="text.secondary" fontSize={12}>Verify a sending domain or sender identity before production email is enabled.</Typography>
      </Box>

      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Card className="settings-hero-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon email"><EmailRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={900}>{config?.sendingDomain ?? 'No sending domain yet'}</Typography>
              {config && <SettingsStatus tone={tone}>{label}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: .6 }}>
              {config?.senderEmail ? `Sender: ${config.senderName} <${config.senderEmail}>` : 'Add a domain below to get the DNS records to publish.'}
              {config?.lastCheckedAt && ` · Last checked ${new Date(config.lastCheckedAt).toLocaleString()}`}
            </Typography>
          </Box>
          {config?.sendingDomain && <Button variant="outlined" disabled={!canEdit || verify.isPending} onClick={check}>{verify.isPending ? 'Checking…' : 'Check DNS'}</Button>}
        </Stack>
      </Card>

      {config?.lastError && <Alert severity="warning">{config.lastError}</Alert>}

      {Boolean(config?.dnsRecords.length) && (
        <Card className="saas-card">
          <Typography variant="h3">DNS records</Typography>
          <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>Publish these at your DNS provider, then run Check DNS.</Typography>
          <Box sx={{ overflowX: 'auto', mt: 1.5 }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Purpose</TableCell><TableCell>Type</TableCell><TableCell>Name</TableCell><TableCell>Value</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>
                {config!.dnsRecords.map((r) => (
                  <TableRow key={r.purpose}>
                    <TableCell>{r.purpose}</TableCell><TableCell>{r.type}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{r.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{r.value}</TableCell>
                    <TableCell>{r.verified ? 'Verified' : 'Pending'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      <Card className="saas-card" component="form" onSubmit={submit}>
        <Typography variant="h3">{config?.sendingDomain ? 'Change sending identity' : 'Add a sending identity'}</Typography>
        <Stack gap={1.5} sx={{ mt: 2 }}>
          <TextField label="Sending domain" placeholder="mail.example.com" {...field('sendingDomain')} />
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField label="Sender email" placeholder="hello@mail.example.com" type="email" {...field('senderEmail')} />
            <TextField label="Sender name" placeholder={active?.name} {...field('senderName')} />
          </Stack>
        </Stack>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: 1.5 }}>The sender email must be on the sending domain. Changing the domain resets verification. PixlPush never needs access to your inbox.</Typography>
        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={!canEdit || configure.isPending || !form.sendingDomain || !form.senderEmail || !form.senderName}>
          {configure.isPending ? 'Saving…' : 'Save and get DNS records'}
        </Button>
      </Card>
    </Stack>
  );
}
