'use client';

import { useEffect, useState } from 'react';
import { CloudUploadRounded } from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, TextField, Typography } from '@mui/material';
import { useApnsSettings } from '@/hooks/projects/use-project-settings';
import type { ApnsSettings } from '@/types/project';
import type { ApiError } from '@/types/auth';

const APPLE_ID = /^[A-Z0-9]{10}$/;
const BUNDLE_ID = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** Apple names the download AuthKey_<KEYID>.p8, so the Key ID can be read off the file name. */
export const keyIdFromFileName = (name: string) => /AuthKey_([A-Z0-9]{10})\.p8$/i.exec(name)?.[1]?.toUpperCase();

/**
 * Connect or replace the direct APNs key (iOS apps without Firebase). Shared by
 * Push setup and onboarding. The backend checks the key with Apple before storing it.
 */
export default function ApnsConnectDialog({ open, onClose, projectId, existing, onConnected }: {
  open: boolean;
  onClose: () => void;
  projectId: string | undefined;
  existing?: ApnsSettings;
  onConnected?: () => void;
}) {
  const { upload } = useApnsSettings(projectId);
  const configured = existing?.status && existing.status !== 'not_configured';
  const [teamId, setTeamId] = useState('');
  const [keyId, setKeyId] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [file, setFile] = useState<{ name: string; text: string }>();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();

  // Opening starts from what is stored (ids only; the key never leaves the backend).
  useEffect(() => {
    if (!open) return;
    setTeamId(existing?.teamId ?? '');
    setKeyId(existing?.keyId ?? '');
    setBundleId(existing?.bundleId ?? '');
    setFile(undefined);
    setConfirm('');
    setError(undefined);
  }, [open, existing?.teamId, existing?.keyId, existing?.bundleId]);

  const pick = async (picked?: File) => {
    setError(undefined);
    if (!picked) return setFile(undefined);
    const text = await picked.text();
    if (!text.includes('BEGIN PRIVATE KEY')) {
      setFile(undefined);
      return setError('This is not an APNs key. Upload the AuthKey_XXXXXXXXXX.p8 file from Apple Developer → Keys.');
    }
    setFile({ name: picked.name, text });
    const fromName = keyIdFromFileName(picked.name);
    if (fromName) setKeyId(fromName);
  };

  const team = teamId.trim().toUpperCase();
  const key = keyId.trim().toUpperCase();
  const bundle = bundleId.trim();
  const isSwitch = Boolean(configured && existing?.bundleId && bundle && bundle !== existing.bundleId);
  const invalid = {
    team: team.length > 0 && !APPLE_ID.test(team),
    key: key.length > 0 && !APPLE_ID.test(key),
    bundle: bundle.length > 0 && !BUNDLE_ID.test(bundle),
  };
  const ready = APPLE_ID.test(team) && APPLE_ID.test(key) && BUNDLE_ID.test(bundle) && (Boolean(file) || Boolean(configured))
    && (!isSwitch || confirm.trim() === bundle);

  const submit = async () => {
    setError(undefined);
    try {
      await upload.mutateAsync({
        teamId: team,
        keyId: key,
        bundleId: bundle,
        ...(file ? { privateKey: file.text } : {}),
        ...(isSwitch ? { confirmBundleId: confirm.trim() } : {}),
      });
      onConnected?.();
      onClose();
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Could not connect APNs. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{configured ? 'Replace APNs key' : 'Connect Apple Push (APNs)'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            For iOS apps that do not use Firebase. In{' '}
            <Link href="https://developer.apple.com/account/resources/authkeys/list" target="_blank" rel="noreferrer">Apple Developer → Keys</Link>
            {' '}click +, tick <b>Apple Push Notifications service (APNs)</b>, and download the .p8 file (Apple lets you download it only once).
            Your Team ID is shown under Membership details.
          </Alert>
          <Button component="label" variant="outlined" startIcon={<CloudUploadRounded />}>
            {file ? file.name : configured ? 'Choose a new .p8 file (optional)' : 'Choose .p8 file'}
            <input type="file" accept=".p8" hidden aria-label="APNs key file" onChange={(e) => pick(e.target.files?.[0])} />
          </Button>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Key ID" value={keyId} onChange={(e) => setKeyId(e.target.value)} error={invalid.key}
              helperText={invalid.key ? '10 letters and digits' : 'Filled in from the file name'} inputProps={{ maxLength: 10 }} autoComplete="off" />
            <TextField label="Team ID" value={teamId} onChange={(e) => setTeamId(e.target.value)} error={invalid.team}
              helperText={invalid.team ? '10 letters and digits' : 'Apple Developer → Membership'} inputProps={{ maxLength: 10 }} autoComplete="off" />
          </Box>
          <TextField label="Bundle ID" value={bundleId} onChange={(e) => setBundleId(e.target.value)} error={invalid.bundle}
            helperText={invalid.bundle ? 'Like com.company.app' : 'Your iOS app’s bundle identifier, e.g. com.company.app'} autoComplete="off" fullWidth />
          {isSwitch && (
            <>
              <Alert severity="warning">This moves push from <b>{existing?.bundleId}</b> to <b>{bundle}</b>. iPhones with the old app stop receiving push.</Alert>
              <TextField label={`Type "${bundle}" to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" fullWidth />
            </>
          )}
          <Typography fontSize="var(--fs-12)" color="text.secondary">Android apps still need Firebase. Use APNs only for iOS apps that do not include Firebase.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!ready || upload.isPending} onClick={submit}>
          {upload.isPending ? 'Checking with Apple…' : 'Validate and connect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
