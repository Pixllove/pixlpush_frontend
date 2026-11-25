'use client';

import { formatUserDateTime } from '@/lib/timezone';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { ProjectPlatform } from '@/types/project';
import { toggleProjectPlatform } from '@/lib/project-platforms';
import { Apple as AppleIcon, ExpandMoreRounded, CheckCircleRounded, CloudUploadRounded, LanguageRounded, PhoneIphoneRounded, ErrorOutlineRounded, LockRounded, RadioButtonUncheckedRounded } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Divider, ButtonBase, Card, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useApnsSettings, useFirebaseSettings } from '@/hooks/projects/use-project-settings';
import ApnsConnectDialog from './ApnsConnectDialog';
import FileDropZone from './FileDropZone';
import { aiApi } from '@/lib/projects/ai';
import SettingsStatus from './SettingsStatus';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

/** Firebase / FCM connection of the active Project. Every Project has its own. */
export default function FirebasePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { active } = useActiveProject();
  const { query, upload, verify, disconnect, platforms: savePlatforms } = useFirebaseSettings(active?.id);
  const config = query.data;
  const queryClient = useQueryClient();
  // Do not guess a platform while the first settings request is in flight.
  // A mobile default here made Firebase/APNs flash for website-only projects.
  const settingsLoaded = config !== undefined;
  const platforms: ProjectPlatform[] = config?.platforms ?? ['mobile'];
  // Choices stay a draft until saved, but the setup sections follow the draft
  // so selecting Mobile immediately reveals Firebase configuration.
  const [draft, setDraft] = useState<{ projectId: string; platforms: ProjectPlatform[] } | null>(null);
  const [saved, setSaved] = useState(false);
  // Keep unsaved choices scoped to their project when the workspace switches.
  const currentDraft = active?.id && draft?.projectId === active.id ? draft.platforms : null;
  const selection = currentDraft ?? platforms;
  const hasWeb = selection.includes('web');
  const hasMobile = selection.includes('mobile');
  const dirty = currentDraft !== null && [...currentDraft].sort().join() !== [...platforms].sort().join();
  const togglePlatform = (id: ProjectPlatform) => {
    setSaved(false);
    if (!active?.id) return;
    setDraft((current) => ({
      projectId: active.id,
      platforms: toggleProjectPlatform(current?.projectId === active.id ? current.platforms : platforms, id),
    }));
  };
  const savePlatformChoice = async () => {
    if (!currentDraft?.length) return;
    setError(undefined);
    try {
      await savePlatforms.mutateAsync(currentDraft);
      // Onboarding progress and the setup banner depend on this choice too.
      await queryClient.invalidateQueries({ queryKey: ['projects', active?.id] });
      setDraft(null);
      setSaved(true);
    } catch (cause) { setError((cause as ApiError).message); }
  };

  const [open, setOpen] = useState(false);
  const [apnsOpen, setApnsOpen] = useState(false);
  const apnsActions = useApnsSettings(active?.id);
  const apns = config?.apns;
  const apnsConfigured = Boolean(apns && apns.status !== 'not_configured');
  const apnsConnected = apns?.status === 'connected';
  const [file, setFile] = useState<{ name: string; text: string; projectId?: string }>();
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
    // Preview only; the backend does the real validation.
    try {
      const parsed = JSON.parse(text);
      projectId = parsed.project_id;
      if (!projectId) setError(parsed.project_info
        ? 'This is google-services.json (app config). Upload the service account key JSON instead.'
        : 'This is not a service account key. It has no project_id.');
    } catch { setError('This file is not valid JSON.'); }
    setFile({ name: picked.name, text, projectId });
  };

  const submit = async () => {
    if (!file) return;
    setError(undefined);
    try {
      await upload.mutateAsync({ serviceAccount: file.text, confirmFirebaseProjectId: isSwitch ? confirm.trim() : undefined });
      const interactionId = searchParams.get('interactionId');
      if (interactionId && active?.id) {
        // The secure form is the only place allowed to handle the credential.
        // The chat interaction is advanced only from the backend-confirmed
        // onboarding state after the upload succeeds.
        await aiApi.reloadInteraction(active.id, { interactionId, requestKey: crypto.randomUUID() });
        await queryClient.invalidateQueries({ queryKey: ['projects', active.id, 'onboarding'] });
        router.push('/dashboard');
      }
      close();
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Could not connect Firebase. Please try again.');
    }
  };

  const run = async (mutation: { mutateAsync: () => Promise<unknown> }) => {
    setError(undefined);
    try { await mutation.mutateAsync(); } catch (cause) { setError((cause as ApiError).message); }
  };

  const mobileDevices = (config?.activeTokens ?? 0) + (apns?.activeDevices ?? 0);
  const checklist: Array<[string, string, boolean]> = [
    ['Service account JSON', configured ? 'Uploaded' : 'Required', configured],
    ['Firebase Cloud Messaging API', connected ? 'Enabled' : config?.status === 'error' ? 'Check failed' : 'Waiting', connected],
    ['Firebase project ID', config?.firebaseProjectId ?? '—', configured],
    ['Service account', config?.clientEmail ?? '—', configured],
    ['Token sync', config?.activeTokens ? `${config.activeTokens} active app devices` : 'Waiting for the mobile SDK', Boolean(config?.activeTokens)],
    ['Last checked', config?.validatedAt ? formatUserDateTime(config.validatedAt) : '—', Boolean(config?.validatedAt)],
  ];

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Push setup</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">Choose Website, Mobile, or both. Website push uses Web Push; mobile push uses Firebase Cloud Messaging, or Apple Push (APNs) for iOS apps without Firebase.</Typography>
      </Box>

      {query.isError && <Alert severity="error" action={!settingsLoaded ? <Button color="inherit" size="small" onClick={() => query.refetch()}>Retry</Button> : undefined}>{query.error.message}</Alert>}
      {error && !open && <Alert severity="error">{error}</Alert>}

      {query.isPending && <Card className="saas-card" aria-label="Loading push settings" aria-busy="true">
        <Skeleton width="32%" height={28} />
        <Skeleton width="58%" height={22} />
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 2 }}>
          <Skeleton variant="rounded" height={88} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={88} sx={{ flex: 1 }} />
        </Stack>
      </Card>}

      {settingsLoaded && <Card className="saas-card">
        <Typography fontWeight={600}>What does {appName} use?</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .5 }}>Select every platform used by this project. The matching setup appears below.</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 2 }}>
          {([['web', 'Website', 'React, Next.js, Vue, Angular, any site. No Firebase needed.', LanguageRounded], ['mobile', 'Mobile app', 'React Native, Flutter or native iOS. Firebase, or Apple Push for iOS without Firebase.', PhoneIphoneRounded]] as const).map(([id, title, detail, Icon]) => {
            const selected = selection.includes(id);
            return (
              <ButtonBase key={id} disabled={!canEdit || savePlatforms.isPending || !config || (selected && selection.length === 1)} onClick={() => togglePlatform(id)} role="checkbox" aria-checked={selected}
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
            <Button variant="contained" disabled={!currentDraft?.length || savePlatforms.isPending} onClick={savePlatformChoice}>{savePlatforms.isPending ? 'Saving…' : 'Save settings'}</Button>
          </Stack>
        )}
      </Card>}

      {settingsLoaded && hasWeb && <Card className="settings-hero-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon"><LanguageRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={600}>Website push</Typography>
              {config && <SettingsStatus tone={config.webPush?.activeBrowsers ? 'success' : 'neutral'}>{config.webPush?.activeBrowsers ? 'Active' : config.webPush?.enabled ? 'Ready' : 'Waiting for the web SDK'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .6 }}>
              {config?.webPush?.activeBrowsers
                ? `${config.webPush.activeBrowsers} subscribed browser${config.webPush.activeBrowsers === 1 ? '' : 's'}. Push campaigns and journeys reach them automatically.`
                : 'Nothing to configure here. Install @pixlpush/web with your SDK key, serve pixlpush-sw.js from your site, and call PixlPush.requestPushPermission() from a button.'}
            </Typography>
          </Box>
          <Button href="/dashboard/integrations/web/quickstart" variant="outlined" size="small" sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', sm: 'center' } }}>Web SDK</Button>
        </Stack>
      </Card>}

      {settingsLoaded && hasMobile && <>
      {hasWeb && <Divider />}
      <Card className="settings-hero-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon"><PhoneIphoneRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={600}>Mobile apps</Typography>
              {config && <SettingsStatus tone={mobileDevices ? 'success' : 'neutral'}>{mobileDevices ? 'Active' : connected || apnsConnected ? 'Ready' : 'Waiting for setup'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .6 }}>
              {mobileDevices
                ? `${mobileDevices} app device${mobileDevices === 1 ? '' : 's'} registered. Push campaigns and journeys reach them automatically.`
                : 'Connect Firebase (Android and iOS), or an APNs key if your iOS app does not use Firebase. You can use both.'}
            </Typography>
          </Box>
          <Button href="/dashboard/integrations/react-native/quickstart" variant="outlined" size="small" sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', sm: 'center' } }}>Mobile SDK guide</Button>
        </Stack>
      </Card>

      <Card className="settings-hero-card">

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon"><CloudUploadRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={600}>Firebase (Android + iOS)</Typography>
              {config && <SettingsStatus tone={connected ? 'success' : config.status === 'error' ? 'warning' : 'neutral'}>{connected ? 'Connected' : config.status === 'error' ? 'Error' : 'Not connected'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .6 }}>
              {query.isPending ? 'Loading…'
                : config?.status === 'error' ? config.lastError
                : configured ? `Firebase project ${config!.firebaseProjectId} · ${config!.clientEmail}${config!.validatedAt ? ` · Last checked ${formatUserDateTime(config!.validatedAt)}` : ''}`
                : 'For apps that include Firebase. Upload a service-account JSON to send push to Android and iOS.'}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {configured && <Button variant="outlined" disabled={!canEdit || verify.isPending} onClick={() => run(verify)}>{verify.isPending ? 'Checking…' : 'Re-check'}</Button>}
            {configured && <Button color="error" variant="outlined" disabled={!canEdit || disconnect.isPending} onClick={() => run(disconnect)}>{disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}</Button>}
            <Tooltip title={configured ? `Moving ${appName} to a different Firebase project? Existing FCM tokens may no longer be valid.` : ''}>
              <span><Button variant="contained" disabled={!canEdit} onClick={() => setOpen(true)}>{configured ? 'Replace credentials' : 'Connect Firebase'}</Button></span>
            </Tooltip>
          </Stack>
        </Stack>
        {configured && <StatusAccordion rows={checklist} warn={config?.status === 'error'} />}
      </Card>

      <Card className="settings-hero-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon"><AppleIcon /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography fontWeight={600}>Apple Push (iOS without Firebase)</Typography>
              {config && <SettingsStatus tone={apnsConnected ? 'success' : apns?.status === 'error' ? 'warning' : 'neutral'}>{apnsConnected ? 'Connected' : apns?.status === 'error' ? 'Error' : 'Not connected'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .6 }}>
              {apns?.status === 'error' ? apns.lastError
                : apnsConfigured ? `${apns!.bundleId} · Team ${apns!.teamId} · Key ${apns!.keyId} · ${apns!.activeDevices ?? 0} iOS device${apns!.activeDevices === 1 ? '' : 's'}${apns!.validatedAt ? ` · Last checked ${formatUserDateTime(apns!.validatedAt)}` : ''}`
                : 'Only for iOS apps that do not include Firebase. Upload the APNs key (.p8) from your Apple Developer account.'}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {apnsConfigured && <Button variant="outlined" disabled={!canEdit || apnsActions.verify.isPending} onClick={() => run(apnsActions.verify)}>{apnsActions.verify.isPending ? 'Checking…' : 'Re-check'}</Button>}
            {apnsConfigured && <Button color="error" variant="outlined" disabled={!canEdit || apnsActions.disconnect.isPending} onClick={() => run(apnsActions.disconnect)}>Disconnect</Button>}
            <Button variant={configured ? 'outlined' : 'contained'} disabled={!canEdit} onClick={() => setApnsOpen(true)}>{apnsConfigured ? 'Replace key' : 'Connect APNs'}</Button>
          </Stack>
        </Stack>
        {apnsConfigured && <StatusAccordion warn={apns?.status === 'error'} rows={[
          ['APNs key (.p8)', 'Uploaded', true],
          ['Apple connection', apnsConnected ? 'Verified' : apns?.status === 'error' ? 'Check failed' : 'Waiting', apnsConnected],
          ['Bundle ID', apns?.bundleId ?? '—', Boolean(apns?.bundleId)],
          ['Team ID · Key ID', apns?.teamId && apns?.keyId ? `${apns.teamId} · ${apns.keyId}` : '—', Boolean(apns?.teamId && apns?.keyId)],
          ['Token sync', apns?.activeDevices ? `${apns.activeDevices} active iOS device${apns.activeDevices === 1 ? '' : 's'}` : 'Waiting for the iOS SDK', Boolean(apns?.activeDevices)],
          ['Last checked', apns?.validatedAt ? formatUserDateTime(apns.validatedAt) : '—', Boolean(apns?.validatedAt)],
        ]} />}
      </Card>
      {apnsConnected && !connected && <Alert severity="info">iOS push is ready through APNs. Android apps still need Firebase.</Alert>}

      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change push settings.</Alert>}
      <Alert severity="info" icon={<LockRounded />}>Credentials are encrypted and stored only in the PixlPush backend. Never place a service-account JSON or a .p8 key inside your app.</Alert>



      </>}

      <ApnsConnectDialog open={apnsOpen} onClose={() => setApnsOpen(false)} projectId={active?.id} existing={apns} />

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{configured ? 'Replace Firebase credentials' : 'Connect Firebase / FCM'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Use a service account that can only send push. In Google Cloud Console open IAM &amp; Admin → Service accounts → Create service account, give it only the role <b>Firebase Cloud Messaging API Admin</b>, then under Keys choose Add key → JSON and upload that file here. PixlPush checks it with Google before saving.
            </Alert>
            <FileDropZone accept="application/json,.json" inputLabel="Firebase service account file" fileName={file?.name} onFile={pick}
              label="Drop your service-account JSON here" hint="Drag the .json key file from Google Cloud, or click to browse." />
            {file?.projectId && <Typography fontSize="var(--fs-12)" color="text.secondary">Firebase project in this file: <b>{file.projectId}</b></Typography>}
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

/** Collapsible connection status for a connected provider (Firebase / APNs). */
function StatusAccordion({ rows, warn }: { rows: Array<[string, string, boolean]>; warn?: boolean }) {
  const done = rows.filter(([, , ok]) => ok).length;
  return (
    <Accordion disableGutters elevation={0} sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}>
        <Typography fontWeight={600} fontSize="var(--fs-13)" sx={{ flex: 1 }}>Connection status</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mr: 1 }}>{done} of {rows.length} ready</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack gap={1.4}>
          {rows.map(([label, value, ok]) => (
            <Stack direction="row" alignItems="center" key={label} gap={1}>
              {ok ? <CheckCircleRounded sx={{ color: '#15965e', fontSize: 19 }} /> : warn ? <ErrorOutlineRounded sx={{ color: '#ad6415', fontSize: 19 }} /> : <RadioButtonUncheckedRounded sx={{ color: '#b6aabf', fontSize: 19 }} />}
              <Typography fontSize="var(--fs-13)" sx={{ flex: 1 }}>{label}</Typography>
              <Typography fontSize="var(--fs-12)" color="text.secondary" sx={{ textAlign: 'right', wordBreak: 'break-all' }}>{value}</Typography>
            </Stack>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
