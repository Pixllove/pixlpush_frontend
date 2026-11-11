'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { ArrowBackRounded, CallMadeRounded, CallReceivedRounded, CheckCircleRounded, LockRounded, PauseCircleRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, CircularProgress, FormControlLabel, Grid, Link, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import { HubspotLogo } from '@/components/integrations/registry';
import HubspotServiceKeyGuide from './HubspotServiceKeyGuide';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useHubspotSettings } from '@/hooks/projects/use-project-settings';
import { hubspotApi } from '@/lib/projects/api';
import SettingsStatus from './SettingsStatus';
import SidePanel from './SidePanel';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

/** "just now", "3 minutes ago", "2 hours ago". */
function timeAgo(date: string | Date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 24 * 60) return rtf.format(-Math.round(minutes / 60), 'hour');
  return new Date(date).toLocaleString();
}

/** HubSpot integration page: connect (sign-in or Service Key) and two-way sync status for the active Project. */
export default function HubspotPanel() {
  const { active } = useActiveProject();
  const { query, connect, setSyncEnabled, syncNow, disconnect, oauthCallback } = useHubspotSettings(active?.id);
  const hubspot = query.data;
  const oauthAvailable = Boolean(hubspot?.oauthAvailable);
  const [useKey, setUseKey] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  /** Code from an install started in the HubSpot Marketplace, waiting for the user to pick the Project. */
  const [marketplaceCode, setMarketplaceCode] = useState<string>();
  const [token, setToken] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [error, setError] = useState<string>();
  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));
  const syncing = Boolean(hubspot?.connected && hubspot.syncing && hubspot.syncEnabled);

  // The worker runs the sync; refresh while it is in progress.
  const { refetch } = query;
  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(() => void refetch(), 5000);
    return () => clearInterval(timer);
  }, [syncing, refetch]);

  const run = async (action: () => Promise<unknown>) => {
    setError(undefined);
    try { await action(); } catch (cause) { setError((cause as ApiError).message); }
  };

  // Back from HubSpot's consent page: ?code&state (approved) or ?error (cancelled). Handled once.
  const handledReturn = useRef(false);
  const { mutateAsync: finishOauth } = oauthCallback;
  useEffect(() => {
    if (!active?.id || handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const denied = params.get('error');
    if (!code && !denied) return;
    handledReturn.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    if (denied) {
      setError('HubSpot was not connected: access was not approved.');
      return;
    }
    if (code && state) void run(async () => { await finishOauth({ code, state }); setReplacing(false); });
    else if (code) setMarketplaceCode(code);
  }, [active?.id, finishOauth]);
  const confirmMarketplaceInstall = () => run(async () => {
    await finishOauth({ code: marketplaceCode! });
    setMarketplaceCode(undefined);
    setReplacing(false);
  });

  const connectWithHubspot = () => run(async () => {
    setRedirecting(true);
    try {
      window.location.assign((await hubspotApi.oauthStart(active!.id)).url);
    } catch (cause) {
      setRedirecting(false);
      throw cause;
    }
  });
  const submit = () => run(async () => {
    await connect.mutateAsync(token.trim());
    setToken('');
    setReplacing(false);
  });
  const confirmDisconnect = () => run(async () => {
    await disconnect.mutateAsync();
    setDisconnectOpen(false);
  });

  const connectCard = (
    <Card className="saas-card">
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography fontWeight={700} fontSize="var(--fs-14)">{hubspot?.connected ? 'Reconnect HubSpot' : 'Connect HubSpot'}</Typography>
        {replacing && <Button onClick={() => { setReplacing(false); setToken(''); }}>Cancel</Button>}
      </Stack>
      {oauthAvailable && (
        <Tabs value={useKey ? 'key' : 'oauth'} onChange={(_, v) => setUseKey(v === 'key')} sx={{ mt: 1, mb: 2, borderBottom: '1px solid #eeeaf3' }}>
          <Tab value="oauth" label="Sign in with HubSpot" />
          <Tab value="key" label="Service Key (manual)" />
        </Tabs>
      )}
      {oauthAvailable && !useKey ? (
        <Stack gap={1.5} alignItems="flex-start">
          <Typography color="text.secondary" fontSize="var(--fs-12)">
            Recommended. Sign in to HubSpot, pick your HubSpot account and approve access. Nothing to copy or paste. Syncing starts within a minute.
          </Typography>
          <Button variant="contained" disabled={!canEdit || redirecting || oauthCallback.isPending} onClick={connectWithHubspot}>
            {oauthCallback.isPending ? 'Connecting…' : redirecting ? 'Opening HubSpot…' : 'Connect with HubSpot'}
          </Button>
        </Stack>
      ) : (
        <>
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: oauthAvailable ? 0 : 0.75 }}>
            Create a Service Key in HubSpot and paste it here. Follow these steps:
          </Typography>
          <HubspotServiceKeyGuide pasteStep={(
            <Stack gap={1}>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                <TextField size="small" fullWidth type="password" label="HubSpot Service Key" placeholder="Starts with pat-…" value={token} onChange={(e) => setToken(e.target.value)} disabled={!canEdit || connect.isPending} autoComplete="off" />
                <Button variant="contained" disabled={!canEdit || token.trim().length < 20 || connect.isPending} onClick={submit} sx={{ whiteSpace: 'nowrap' }}>{connect.isPending ? 'Checking…' : 'Connect'}</Button>
              </Stack>
              <Typography color="text.secondary" fontSize="var(--fs-12)">
                PixlPush checks the key with HubSpot, encrypts it and never shows it again.{' '}
                <Link href="https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys" target="_blank" rel="noopener noreferrer">HubSpot&apos;s guide</Link>
              </Typography>
            </Stack>
          )} />
        </>
      )}
    </Card>
  );

  const statusCard = hubspot?.connected && (
    <Card className="saas-card">
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} gap={1.5}>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} fontSize="var(--fs-14)">Connected to HubSpot</Typography>
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.25 }}>
            HubSpot account {hubspot.portalId} · {hubspot.authType === 'oauth' ? 'Signed in with HubSpot' : 'Connected with a Service Key'}
          </Typography>
        </Box>
        <Button variant="outlined" disabled={!canEdit || !hubspot.syncEnabled || syncing || syncNow.isPending} onClick={() => run(() => syncNow.mutateAsync())}>Sync now</Button>
      </Stack>

      <Stack direction="row" alignItems="center" gap={1.25} sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: syncing ? '#f4effc' : hubspot.syncEnabled ? '#eefaf3' : '#f5f4f7' }}>
        {syncing ? <CircularProgress size={18} thickness={5} /> : hubspot.syncEnabled ? <CheckCircleRounded sx={{ color: '#15965e', fontSize: 20 }} /> : <PauseCircleRounded sx={{ color: 'text.secondary', fontSize: 20 }} />}
        <Box>
          <Typography fontWeight={600} fontSize="var(--fs-13)">
            {syncing ? (hubspot.lastSyncedAt ? 'Checking for changes…' : 'Bringing in your HubSpot contacts…') : hubspot.syncEnabled ? 'Everything is up to date' : 'Automatic sync is paused'}
          </Typography>
          <Typography color="text.secondary" fontSize="var(--fs-12)">
            {syncing
              ? (hubspot.lastSyncedAt ? 'This usually takes a few seconds.' : 'The first sync can take a few minutes for large accounts. You can leave this page.')
              : hubspot.syncEnabled
                ? `Last checked ${hubspot.lastSyncedAt ? timeAgo(hubspot.lastSyncedAt) : 'just now'}. PixlPush checks again every 2 minutes.`
                : 'Turn on automatic sync to keep HubSpot and PixlPush in step.'}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        {[
          ['Contacts imported', 'HubSpot contacts added to PixlPush', hubspot.counts.created],
          ['Users sent to HubSpot', 'PixlPush users added as contacts', hubspot.counts.pushed ?? 0],
          ['Profiles completed', 'Empty details filled in from HubSpot', hubspot.counts.updated],
          ['Not imported', 'No email, or matches more than one user', hubspot.counts.skipped],
        ].map(([label, help, value]) => (
          <Grid item xs={6} md={3} key={label as string}>
            <Box sx={{ p: 1.5, height: '100%', border: '1px solid #eeeaf3', borderRadius: 2 }}>
              <Typography fontWeight={700} fontSize="var(--fs-18)">{Number(value).toLocaleString()}</Typography>
              <Typography fontWeight={600} fontSize="var(--fs-12)">{label}</Typography>
              <Typography color="text.secondary" fontSize="var(--fs-11)">{help}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography color="text.secondary" fontSize="var(--fs-11)" sx={{ mt: 1 }}>Totals since you connected HubSpot.</Typography>
      {hubspot.lastError && <Alert severity="warning" sx={{ mt: 2 }}>{hubspot.lastError}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mt: 2, pt: 2, borderTop: '1px solid #eeeaf3' }}>
        <FormControlLabel
          sx={{ ml: 0, gap: 1 }}
          control={<Switch checked={hubspot.syncEnabled} disabled={!canEdit || setSyncEnabled.isPending} onChange={(_, on) => run(() => setSyncEnabled.mutateAsync(on))} />}
          label={(
            <Box>
              <Typography fontSize="var(--fs-13)" fontWeight={600}>Automatic sync</Typography>
              <Typography color="text.secondary" fontSize="var(--fs-11)">{hubspot.syncEnabled ? 'On · checks every 2 minutes' : 'Off · nothing syncs until you turn it on'}</Typography>
            </Box>
          )}
        />
        <Stack direction="row" gap={1}>
          {!replacing && <Button variant="outlined" disabled={!canEdit} onClick={() => setReplacing(true)}>{oauthAvailable ? 'Change account' : 'Replace key'}</Button>}
          <Button variant="outlined" color="error" disabled={!canEdit || disconnect.isPending} aria-haspopup="dialog" onClick={() => { setError(undefined); setDisconnectOpen(true); }}>Disconnect</Button>
        </Stack>
      </Stack>
    </Card>
  );

  const status = !hubspot?.connected ? null : hubspot.status === 'error' ? ['warning', 'Needs attention'] as const : !hubspot.syncEnabled ? ['neutral', 'Paused'] as const : ['success', 'Connected'] as const;

  return (
    <Stack gap={2.5}>
      <Link component={NextLink} href="/dashboard/integrations" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 'var(--fs-13)', alignSelf: 'flex-start' }}>
        <ArrowBackRounded sx={{ fontSize: 16 }} /> All integrations
      </Link>

      <Card className="saas-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
          <HubspotLogo size={48} />
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography fontWeight={700} fontSize="var(--fs-16)">HubSpot</Typography>
              <Chip size="small" label="CRM" className="neutral-chip" />
              {status ? <SettingsStatus tone={status[0]}>{status[1]}</SettingsStatus> : <Chip size="small" variant="outlined" label="Not connected" />}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.5 }}>
              Keep HubSpot and PixlPush in step. HubSpot contacts become PixlPush users you can reach with push, email and journeys, and new PixlPush users are added to HubSpot as contacts.
            </Typography>
          </Box>
        </Stack>
      </Card>

      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(undefined)}>{error}</Alert>}
      {marketplaceCode && (
        <Alert
          severity="info"
          action={(
            <Stack direction="row" gap={1}>
              <Button color="inherit" onClick={() => setMarketplaceCode(undefined)} disabled={oauthCallback.isPending}>Cancel</Button>
              <Button variant="contained" onClick={confirmMarketplaceInstall} disabled={!canEdit || oauthCallback.isPending}>{oauthCallback.isPending ? 'Connecting…' : 'Connect'}</Button>
            </Stack>
          )}
        >
          Finish installing PixlPush from HubSpot: connect it to the project <strong>{active?.name}</strong>? To use another project, switch projects first.
        </Alert>
      )}
      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change the HubSpot connection.</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Stack gap={2.5}>
            {statusCard}
            {hubspot && (!hubspot.connected || replacing) && connectCard}
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack gap={2.5}>
            <Card className="saas-card">
              <Typography fontWeight={700} fontSize="var(--fs-14)">How the sync works</Typography>
              <Stack gap={1.5} sx={{ mt: 1.5 }}>
                <Stack direction="row" gap={1.25}>
                  <Box className="integration-icon" sx={{ width: 32, height: 32, flexShrink: 0 }}><CallReceivedRounded fontSize="small" /></Box>
                  <Typography color="text.secondary" fontSize="var(--fs-12)"><strong>HubSpot → PixlPush.</strong> New and changed contacts come in within about 2 minutes. Only empty profile details are filled in.</Typography>
                </Stack>
                <Stack direction="row" gap={1.25}>
                  <Box className="integration-icon" sx={{ width: 32, height: 32, flexShrink: 0 }}><CallMadeRounded fontSize="small" /></Box>
                  <Typography color="text.secondary" fontSize="var(--fs-12)"><strong>PixlPush → HubSpot.</strong> Users added in the app, imported or tracked by the SDK are added as contacts with their name and country. Existing contacts are linked, never changed.</Typography>
                </Stack>
              </Stack>
            </Card>
            <Card className="saas-card">
              <Typography fontWeight={700} fontSize="var(--fs-14)">Good to know</Typography>
              <Box component="ul" sx={{ pl: 2.5, mb: 0, mt: 1, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.5 } }}>
                <li>Users are matched by HubSpot ID, then email, so no duplicates are made. Contacts without an email are skipped.</li>
                <li>Unsubscribed in HubSpot means not opted in to email in PixlPush. Sync never opts someone in.</li>
                <li>New contacts count toward your plan&apos;s user limit.</li>
                <li>Nothing is ever deleted on either side.</li>
              </Box>
            </Card>
            <Alert severity="info" icon={<LockRounded />}>HubSpot access is encrypted and never shown again. Disconnecting removes PixlPush&apos;s access from HubSpot.</Alert>
          </Stack>
        </Grid>
      </Grid>

      <SidePanel
        open={disconnectOpen}
        onClose={() => { if (!disconnect.isPending) setDisconnectOpen(false); }}
        eyebrow="HubSpot integration"
        title="Disconnect HubSpot?"
        label="Confirm HubSpot disconnect"
        closeLabel="Close disconnect confirmation"
        footer={(
          <>
            <Button onClick={() => setDisconnectOpen(false)} disabled={disconnect.isPending}>Cancel</Button>
            <Button color="error" variant="contained" onClick={confirmDisconnect} disabled={disconnect.isPending}>
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </>
        )}
      >
        <Typography color="text.secondary" fontSize="var(--fs-13)">
          Disconnecting stops future HubSpot syncs. Users already synced stay in PixlPush, and contacts stay in HubSpot.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </SidePanel>
    </Stack>
  );
}
