'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ProjectPlatform } from '@/types/project';
import { CheckCircleRounded, CloudUploadRounded, LanguageRounded, PhoneIphoneRounded, ErrorOutlineRounded, LockRounded, RadioButtonUncheckedRounded, WarningAmberRounded } from '@mui/icons-material';
import { Alert, Box, Button, ButtonBase, Card, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useFirebaseSettings } from '@/hooks/projects/use-project-settings';
import SettingsStatus from './SettingsStatus';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

/** Firebase / FCM connection of the active Project. Every Project has its own. */
export default function FirebasePanel() {
  const { active } = useActiveProject();
  const { query, upload, verify, disconnect, platforms: savePlatforms } = useFirebaseSettings(active?.id);
  const config = query.data;
  const queryClient = useQueryClient();
  const platforms = config?.platforms ?? ['mobile'];
  const hasWeb = platforms.includes('web');
  const hasMobile = platforms.includes('mobile');
  // Choices are a draft until "Save settings"; the sections below follow the saved value.
  const [draft, setDraft] = useState<ProjectPlatform[] | null>(null);
  const [saved, setSaved] = useState(false);
  const selection = draft ?? platforms;
  const dirty = draft !== null && [...draft].sort().join() !== [...platforms].sort().join();
  const togglePlatform = (id: ProjectPlatform) => {
    setSaved(false);
    setDraft([id]); // one platform per Project
  };
  const savePlatformChoice = async () => {
    if (!draft?.length) return;
    setError(undefined);
    try {
      await savePlatforms.mutateAsync(draft);
      // Onboarding progress and the setup banner depend on this choice too.
      await queryClient.invalidateQueries({ queryKey: ['projects', active?.id] });
      setDraft(null);
      setSaved(true);
    } catch (cause) { setError((cause as ApiError).message); }
  };

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
      if (!projectId) setError(parsed.project_info
        ? 'This is google-services.json (app config). Upload the service account key JSON instead.'
        : 'This is not a service account key. It has no project_id.');
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
    ['Token sync', config?.activeTokens ? `${config.activeTokens} active app devices` : 'Waiting for the mobile SDK', Boolean(config?.activeTokens)],
  ];

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Push setup</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">Each project is either a website (Web Push, no Firebase) or a mobile app (React Native or Flutter, via Firebase).</Typography>
      </Box>

      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && !open && <Alert severity="error">{error}</Alert>}

      <Card className="saas-card">
        <Typography fontWeight={600}>What does {appName} use?</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .5 }}>Choose one. Only the setup you need is shown below.</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 2 }}>
          {([['web', 'Website', 'React, Next.js, Vue, Angular, any site. No Firebase needed.', LanguageRounded], ['mobile', 'Mobile app', 'React Native or Flutter. Needs your Firebase project.', PhoneIphoneRounded]] as const).map(([id, title, detail, Icon]) => {
            const selected = selection.includes(id);
            return (
              <ButtonBase key={id} disabled={!canEdit || savePlatforms.isPending || !config} onClick={() => togglePlatform(id)} role="radio" aria-checked={selected}
                sx={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, p: 1.75, borderRadius: 2, border: '1px solid', borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? 'rgba(99,57,214,.06)' : 'transparent' }}>
                <Icon color={selected ? 'primary' : 'disabled'} />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={600} fontSize="var(--fs-13)">{title}</Typography>
                  <Typography color="text.secondary" fontSize="var(--fs-12)">{detail}</Typography>
                </Box>
                {selected ? <CheckCircleRounded color="primary" /> : <RadioButtonUncheckedRounded sx={{ color: '#b6aabf' }} />}
              </ButtonBase>
            );
          })}
        </Stack>
        {saved && !dirty && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSaved(false)}>Settings saved. The setup below now matches your choice.</Alert>}
        {dirty && (
          <Stack direction="row" gap={1} justifyContent="flex-end" alignItems="center" sx={{ mt: 2 }}>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mr: 'auto' }}>You have unsaved changes.</Typography>
            <Button disabled={savePlatforms.isPending} onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="contained" disabled={!draft?.length || savePlatforms.isPending} onClick={savePlatformChoice}>{savePlatforms.isPending ? 'Saving…' : 'Save settings'}</Button>
          </Stack>
        )}
      </Card>

      {hasWeb && <Card className="settings-hero-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon"><LanguageRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={600}>Website push (Web Push)</Typography>
              {config && <SettingsStatus tone={config.webPush?.activeBrowsers ? 'success' : 'neutral'}>{config.webPush?.activeBrowsers ? 'Active' : config.webPush?.enabled ? 'Ready' : 'Waiting for the web SDK'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .6 }}>
              {config?.webPush?.activeBrowsers
                ? `${config.webPush.activeBrowsers} subscribed browser${config.webPush.activeBrowsers === 1 ? '' : 's'}. Push campaigns and journeys reach them automatically.`
                : 'Nothing to configure here. Install @pixlpush/web with your SDK key, serve pixlpush-sw.js from your site, and call PixlPush.requestPushPermission() from a button.'}
            </Typography>
          </Box>
          <Button href="/dashboard/integrations/web/quickstart" variant="outlined" size="small" sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', sm: 'center' } }}>Web SDK guide</Button>
        </Stack>
      </Card>}

      {hasMobile && <>
      <Typography fontWeight={600} sx={{ mt: 1 }}>Mobile apps (Firebase / FCM)</Typography>

      <Card className="settings-hero-card">

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon"><CloudUploadRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={600}>Firebase service account</Typography>
              {config && <SettingsStatus tone={connected ? 'success' : config.status === 'error' ? 'warning' : 'neutral'}>{connected ? 'Connected' : config.status === 'error' ? 'Error' : 'Not connected'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .6 }}>
              {query.isPending ? 'Loading…'
                : config?.status === 'error' ? config.lastError
                : configured ? `Firebase project ${config!.firebaseProjectId} · ${config!.clientEmail}${config!.validatedAt ? ` · Last checked ${new Date(config!.validatedAt).toLocaleString()}` : ''}`
                : 'Only needed for mobile apps. Upload a service-account JSON to send push to Android and iOS.'}
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
              <Typography fontSize="var(--fs-13)" sx={{ flex: 1 }}>{label}</Typography>
              <Typography fontSize="var(--fs-12)" color="text.secondary">{value}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>

      {configured && (
        <Card className="saas-card">
          <Typography variant="h3">Change Firebase project</Typography>
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .5 }}>Use this only when moving {appName} to a completely different Firebase project. Existing FCM tokens may no longer be valid.</Typography>
          <Stack direction="row" gap={1.5} sx={{ mt: 2 }}>
            <Button color="warning" variant="outlined" startIcon={<WarningAmberRounded />} disabled={!canEdit} onClick={() => setOpen(true)}>Start change flow</Button>
            <Button color="error" disabled={!canEdit || disconnect.isPending} onClick={() => { if (window.confirm('Disconnect Firebase? Push sending stops for this Project.')) run(disconnect); }}>Disconnect</Button>
          </Stack>
        </Card>
      )}

      </>}

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
            {file?.projectId && <Typography fontSize="var(--fs-12)" color="text.secondary">Firebase project in this file: <b>{file.projectId}</b></Typography>}
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
