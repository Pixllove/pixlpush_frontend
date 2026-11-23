'use client';

import { useEffect, useState } from 'react';
import { AddRounded, CloseRounded, ContentCopyRounded, DeleteOutlineRounded } from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import { dataSyncApi, type CreatedSyncCredential, type SyncEnvironment, type SyncSource } from '@/lib/projects/api';

const STEPS = ['Connect', 'Map fields', 'Server key', 'Test'];
const TARGETS = [['email', 'Email'], ['name', 'Name'], ['userType', 'User type'], ['accountStatus', 'Account status'], ['timezone', 'Time zone'], ['preferredLanguage', 'Language'], ['country', 'Country'], ['region', 'Region'], ['custom', 'Custom property']];
type Row = { id: number; source: string; target: string; property: string };
const errorText = (error: unknown) => {
  const value = error as { message?: string; details?: { errors?: { message: string }[] } };
  return value?.details?.errors?.[0]?.message ?? value?.message ?? 'Something went wrong. Please try again.';
};
const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function DataSyncSetupDialog({ open, projectId, onClose, onCreated }: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (source: SyncSource) => void | Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<SyncEnvironment>('production');
  const [source, setSource] = useState<SyncSource>();
  const [rows, setRows] = useState<Row[]>([{ id: 1, source: '', target: 'email', property: '' }]);
  const [consentField, setConsentField] = useState('');
  const [optIn, setOptIn] = useState('true');
  const [optOut, setOptOut] = useState('false');
  const [credential, setCredential] = useState<CreatedSyncCredential>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) return;
    setStep(0); setName(''); setEnvironment('production'); setSource(undefined); setCredential(undefined); setError('');
    setRows([{ id: 1, source: '', target: 'email', property: '' }]); setConsentField(''); setOptIn('true'); setOptOut('false');
  }, [open]);

  const filled = rows.filter((row) => row.source.trim());
  const mapsEmail = filled.some((row) => row.target === 'email');
  const customValid = filled.every((row) => row.target !== 'custom' || /^[a-z][a-z0-9_]{0,62}$/.test(row.property));
  const consentValid = !mapsEmail || Boolean(consentField.trim() && list(optIn).length && list(optOut).length);
  const canContinue = step === 0 ? Boolean(name.trim()) : step === 1 ? filled.length > 0 && customValid && consentValid : step === 2 ? Boolean(credential) : true;
  const update = (id: number, patch: Partial<Row>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  const next = async () => {
    setBusy(true);
    setError('');
    try {
      if (step === 0 && !source) {
        const created = await dataSyncApi.createSource(projectId, { name: name.trim(), environment });
        setSource(created);
        await onCreated(created);
      }
      if (step === 1 && source) {
        const config = {
          fields: filled.map((row) => ({ source: row.source.trim(), target: row.target === 'custom' ? `properties.${row.property}` : row.target })),
          consent: consentField.trim() ? [{ channel: 'email', source: consentField.trim(), optIn: list(optIn), optOut: list(optOut) }] : [],
          segments: [], events: [],
        };
        const draft = await dataSyncApi.createMapping(projectId, source.id, config);
        if (!draft.validation.valid) throw new Error(draft.validation.errors[0]?.message ?? 'Fix the mapping before continuing.');
        await dataSyncApi.publishMapping(projectId, source.id, draft.version);
      }
      if (step === 3) return onClose();
      setStep(step + 1);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  const createKey = async () => {
    if (!source) return;
    setBusy(true);
    setError('');
    try {
      setCredential(await dataSyncApi.createCredential(projectId, source.id, `${source.name} server key`));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  const apiBase = 'https://YOUR_PIXLPUSH_API';
  const curl = `curl ${apiBase}/server/v1/ping \\\n  -H "Authorization: Bearer $PIXLPUSH_SERVER_KEY"`;

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h3" component="span">Connect a data source</Typography>
        <Typography color="text.secondary" variant="body2">Send trusted data from your server. No messages are sent during setup.</Typography>
        <IconButton aria-label="Close" onClick={onClose} disabled={busy} sx={{ position: 'absolute', right: 16, top: 16 }}><CloseRounded /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack gap={3}>
          <Stepper activeStep={step} alternativeLabel>{STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {step === 0 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
            <TextField autoFocus label="Source name" placeholder="e.g. Main backend" value={name} disabled={Boolean(source)} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 80 }} helperText="The system that will send data to PixlPush." />
            <TextField select label="Environment" value={environment} disabled={Boolean(source)} onChange={(event) => setEnvironment(event.target.value as SyncEnvironment)}>
              {['development', 'staging', 'production'].map((value) => <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>{value}</MenuItem>)}
            </TextField>
          </Box>}

          {step === 1 && <Stack gap={2}>
            <Box><Typography variant="h4">Map your user fields</Typography><Typography variant="body2" color="text.secondary">Enter the field names your system sends. Your user ID is always sent as externalUserId.</Typography></Box>
            {rows.map((row) => <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'flex-start' }}>
              <TextField size="small" fullWidth label="Your field" value={row.source} onChange={(event) => update(row.id, { source: event.target.value })} />
              <TextField select size="small" fullWidth label="PixlPush field" value={row.target} onChange={(event) => update(row.id, { target: event.target.value })}>{TARGETS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
              {row.target === 'custom' && <TextField size="small" fullWidth label="Property key" value={row.property} error={Boolean(row.property) && !/^[a-z][a-z0-9_]{0,62}$/.test(row.property)} helperText="Lowercase letters, numbers, _" onChange={(event) => update(row.id, { property: event.target.value })} />}
              <IconButton aria-label="Remove field" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><DeleteOutlineRounded fontSize="small" /></IconButton>
            </Stack>)}
            <Button startIcon={<AddRounded />} sx={{ alignSelf: 'flex-start' }} onClick={() => setRows((current) => [...current, { id: Math.max(...current.map((row) => row.id)) + 1, source: '', target: 'name', property: '' }])}>Add field</Button>
            {mapsEmail && <Stack gap={1.5}>
              <Divider />
              <Box><Typography variant="subtitle1">Email consent</Typography><Typography variant="body2" color="text.secondary">Required when syncing email. Unrecognized values are treated as no consent.</Typography></Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                <TextField size="small" label="Your consent field" value={consentField} onChange={(event) => setConsentField(event.target.value)} />
                <TextField size="small" label="Opted-in values" helperText="Comma separated" value={optIn} onChange={(event) => setOptIn(event.target.value)} />
                <TextField size="small" label="Opted-out values" helperText="Comma separated" value={optOut} onChange={(event) => setOptOut(event.target.value)} />
              </Box>
            </Stack>}
          </Stack>}

          {step === 2 && <Stack gap={1.5}>
            <Box><Typography variant="h4">Create a server key</Typography><Typography variant="body2" color="text.secondary">Keep this key on your server. Never put it in an app or website.</Typography></Box>
            {credential ? <Alert severity="warning"><Stack gap={1}><Typography variant="body2">Copy this key now. PixlPush cannot show it again.</Typography><Box component="code" sx={{ fontFamily: 'var(--pp-mono)', wordBreak: 'break-all' }}>{credential.key}</Box><Button size="small" startIcon={<ContentCopyRounded />} sx={{ alignSelf: 'flex-start' }} onClick={() => void navigator.clipboard.writeText(credential.key)}>Copy key</Button></Stack></Alert>
              : <Button variant="outlined" disabled={busy} sx={{ alignSelf: 'flex-start' }} onClick={() => void createKey()}>Create server key</Button>}
          </Stack>}

          {step === 3 && <Stack gap={1.5}>
            <Alert severity="success">{source?.name} is connected and its mapping is published.</Alert>
            <Typography variant="body2" color="text.secondary">Run this from your server to test the connection. Replace the host with your PixlPush API address.</Typography>
            <Box component="pre" sx={{ m: 0, p: 1.5, overflowX: 'auto', borderRadius: 1, bgcolor: 'action.hover', fontFamily: 'var(--pp-mono)', fontSize: 'var(--fs-12)' }}>{curl}</Box>
          </Stack>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button disabled={busy || step === 0 || step === 3} onClick={() => setStep(step - 1)}>Back</Button>
        <Button variant="contained" disabled={busy || !canContinue} onClick={() => void next()}>{step === 3 ? 'Done' : busy ? 'Saving…' : 'Continue'}</Button>
      </DialogActions>
    </Dialog>
  );
}
