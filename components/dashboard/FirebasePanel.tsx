'use client';

import { useState } from 'react';
import { CheckCircleRounded, CloudUploadRounded, ErrorOutlineRounded, LockRounded, RadioButtonUncheckedRounded, WarningAmberRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useFirebaseSettings } from '@/hooks/projects/use-project-settings';
import SettingsStatus from './SettingsStatus';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

/** Firebase / FCM connection of the active Project. Every Project has its own. */
export default function FirebasePanel() {
  const { active } = useActiveProject();
  const { query, upload, verify, disconnect } = useFirebaseSettings(active?.id);
  const config = query.data;

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{ name: string; text: string; projectId?: string; adminKey?: boolean }>();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();

  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));
  const connected = config?.status === 'connected';
  const configured = Boolean(config?.firebaseProjectId);
  // Switching Firebase projects invalidates stored tokens: typed confirmation.
  const isSwitch = configured && Boolean(file?.projectId) && file?.projectId !== config?.firebaseProjectId;
  const appName = active?.name ?? 'this Project';

  const close = () => { setOpen(false); setFile(undefined); setConfirm(''); setError(undefined); };

  const pick = async (picked?: File) => {
    setError(undefined);
    if (!picked) return setFile(undefined);
    const text = await picked.text();
    let projectId: string | undefined;
    let adminKey = false;
    // Preview only; the backend does the real validation.
    try {
      const parsed = JSON.parse(text);
      projectId = parsed.project_id;
      // Firebase's default Admin SDK account can do far more than send push.
      adminKey = typeof parsed.client_email === 'string' && parsed.client_email.startsWith('firebase-adminsdk');
    } catch { setError('This file is not valid JSON.'); }
    setFile({ name: picked.name, text, projectId, adminKey });
  };

  const submit = async () => {
    if (!file) return;
    setError(undefined);
    try {
      await upload.mutateAsync({ serviceAccount: file.text, confirmFirebaseProjectId: isSwitch ? confirm.trim() : undefined });
      close();
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Could not connect Firebase. Please try again.');
    }
  };

  const run = async (mutation: typeof verify | typeof disconnect) => {
    setError(undefined);
    try { await mutation.mutateAsync(); } catch (cause) { setError((cause as ApiError).message); }
  };

  const checklist: Array<[string, string, boolean]> = [
    ['Service account JSON', configured ? 'Uploaded' : 'Required', configured],
    ['Firebase Cloud Messaging API', connected ? 'Enabled' : config?.status === 'error' ? 'Check failed' : 'Waiting', connected],
    ['Firebase project ID', config?.firebaseProjectId ?? '—', configured],
    ['Token sync', config?.activeTokens ? `${config.activeTokens} active device tokens` : 'Waiting for the SDK', Boolean(config?.activeTokens)],
  ];

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Firebase / FCM</Typography>
        <Typography color="text.secondary" fontSize={12}>Connect the Firebase project used by {appName} for push delivery and device token management.</Typography>
      </Box>

      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && !open && <Alert severity="error">{error}</Alert>}

      <Card className="settings-hero-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon"><CloudUploadRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={600}>Firebase service account</Typography>
              {config && <SettingsStatus tone={connected ? 'success' : config.status === 'error' ? 'warning' : 'neutral'}>{connected ? 'Connected' : config.status === 'error' ? 'Error' : 'Not connected'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: .6 }}>
              {query.isPending ? 'Loading…'
                : config?.status === 'error' ? config.lastError
                : configured ? `Firebase project ${config!.firebaseProjectId} · ${config!.clientEmail}${config!.validatedAt ? ` · Last checked ${new Date(config!.validatedAt).toLocaleString()}` : ''}`
                : 'Upload a service-account JSON to enable production push sending.'}
            </Typography>
          </Box>
          <Stack direction="row" gap={1}>
            {configured && <Button variant="outlined" disabled={!canEdit || verify.isPending} onClick={() => run(verify)}>{verify.isPending ? 'Checking…' : 'Re-check'}</Button>}
            <Button variant="contained" disabled={!canEdit} onClick={() => setOpen(true)}>{configured ? 'Replace credentials' : 'Connect Firebase'}</Button>
          </Stack>
        </Stack>
      </Card>

      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change Firebase settings.</Alert>}
      <Alert severity="info" icon={<LockRounded />}>Credentials are encrypted and stored only in the PixlPush backend. Never place service-account credentials inside your customer app.</Alert>

      <Card className="saas-card">
        <Typography variant="h3">Connection checklist</Typography>
        <Stack gap={1.6} sx={{ mt: 2 }}>
          {checklist.map(([label, value, done]) => (
            <Stack direction="row" alignItems="center" key={label}>
              {done ? <CheckCircleRounded sx={{ color: '#15965e', fontSize: 19, mr: 1 }} /> : config?.status === 'error' && label.startsWith('Firebase Cloud') ? <ErrorOutlineRounded sx={{ color: '#ad6415', fontSize: 19, mr: 1 }} /> : <RadioButtonUncheckedRounded sx={{ color: '#b6aabf', fontSize: 19, mr: 1 }} />}
              <Typography fontSize={13} sx={{ flex: 1 }}>{label}</Typography>
              <Typography fontSize={12} color="text.secondary">{value}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>

      {configured && (
        <Card className="saas-card">
          <Typography variant="h3">Change Firebase project</Typography>
          <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>Use this only when moving {appName} to a completely different Firebase project. Existing FCM tokens may no longer be valid.</Typography>
          <Stack direction="row" gap={1.5} sx={{ mt: 2 }}>
            <Button color="warning" variant="outlined" startIcon={<WarningAmberRounded />} disabled={!canEdit} onClick={() => setOpen(true)}>Start change flow</Button>
            <Button color="error" disabled={!canEdit || disconnect.isPending} onClick={() => { if (window.confirm('Disconnect Firebase? Push sending stops for this Project.')) run(disconnect); }}>Disconnect</Button>
          </Stack>
        </Card>
      )}

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{configured ? 'Replace Firebase credentials' : 'Connect Firebase / FCM'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Use a service account that can only send push. In Google Cloud Console open IAM &amp; Admin → Service accounts → Create service account, give it only the role <b>Firebase Cloud Messaging API Admin</b>, then under Keys choose Add key → JSON and upload that file here. PixlPush checks it with Google before saving.
            </Alert>
            <Button component="label" variant="outlined" startIcon={<CloudUploadRounded />}>
              {file ? file.name : 'Choose JSON file'}
              <input type="file" accept="application/json,.json" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </Button>
            {file?.projectId && <Typography fontSize={12} color="text.secondary">Firebase project in this file: <b>{file.projectId}</b></Typography>}
            {file?.adminKey && (
              <Alert severity="warning">This is Firebase’s default Admin key. It works, but it also gives access to your database, users and storage. A key that can only send push is safer.</Alert>
            )}
            {isSwitch && (
              <>
                <Alert severity="warning">This moves {appName} from <b>{config?.firebaseProjectId}</b> to <b>{file?.projectId}</b>. Existing device push tokens may stop working until users reopen the app.</Alert>
                <TextField label={`Type "${file?.projectId}" to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" fullWidth />
              </>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button variant="contained" disabled={!file?.projectId || upload.isPending || (isSwitch && confirm.trim() !== file?.projectId)} onClick={submit}>
            {upload.isPending ? 'Validating…' : 'Validate and connect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
