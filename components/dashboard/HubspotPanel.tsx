'use client';

import { useEffect, useRef, useState } from 'react';
import { LockRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, FormControlLabel, Link, Stack, Switch, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useHubspotSettings } from '@/hooks/projects/use-project-settings';
import { hubspotApi } from '@/lib/projects/api';
import SettingsStatus from './SettingsStatus';
import SidePanel from './SidePanel';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

/** HubSpot <-> PixlPush users for the active Project. */
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

  const oauthForm = (
    <Card className="saas-card">
      <Typography fontWeight={700} fontSize="var(--fs-14)">{hubspot?.connected ? 'Reconnect HubSpot' : 'Connect HubSpot'}</Typography>
      <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.75, mb: 1.5 }}>
        Sign in to HubSpot and approve access. PixlPush reads your contacts and adds your PixlPush users that HubSpot doesn&apos;t have yet. It never changes or deletes existing contacts. No key to copy.
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <Button variant="contained" disabled={!canEdit || redirecting || oauthCallback.isPending} onClick={connectWithHubspot}>
          {oauthCallback.isPending ? 'Connecting…' : redirecting ? 'Opening HubSpot…' : 'Connect with HubSpot'}
        </Button>
        <Button variant="outlined" onClick={() => setUseKey((on) => !on)}>{useKey ? 'Hide Service Key option' : 'Use a Service Key instead'}</Button>
        {replacing && <Button onClick={() => setReplacing(false)}>Cancel</Button>}
      </Stack>
    </Card>
  );

  const form = (
    <Card className="saas-card">
      <Typography fontWeight={700} fontSize="var(--fs-14)">{hubspot?.connected ? 'Replace the Service Key' : 'Connect with a Service Key'}</Typography>
      <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.75 }}>
        In HubSpot, create a Service Key. You may need your HubSpot admin to give you access to this option.
      </Typography>
      <Box component="ol" sx={{ pl: 2.5, my: 1.5, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.75 } }}>
        <li>Open <strong>Development → Keys → Service keys</strong>, then choose <strong>Create service key</strong>. In some accounts, Service Keys are under <strong>Settings → Integrations</strong>.</li>
        <li>Name the key (for example, <strong>PixlPush contacts</strong>) and allow <strong>crm.objects.contacts.read</strong> and <strong>crm.objects.contacts.write</strong>. PixlPush reads your contacts and adds your PixlPush users that HubSpot doesn&apos;t have yet. It never changes or deletes existing contacts.</li>
        <li>Create the key, copy it, and paste it below. Keep the key private; PixlPush encrypts it and will not show it again.</li>
      </Box>
      <Link href="https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys" target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-block', mb: 1.5, fontSize: 'var(--fs-12)' }}>
        View HubSpot’s step-by-step guide with screenshots
      </Link>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField size="small" fullWidth type="password" label="HubSpot Service Key" placeholder="Starts with pat-…" value={token} onChange={(e) => setToken(e.target.value)} disabled={!canEdit || connect.isPending} autoComplete="off" />
        <Stack direction="row" gap={1}>
          {replacing && !oauthAvailable && <Button onClick={() => { setReplacing(false); setToken(''); }}>Cancel</Button>}
          <Button variant="contained" disabled={!canEdit || token.trim().length < 20 || connect.isPending} onClick={submit} sx={{ whiteSpace: 'nowrap' }}>{connect.isPending ? 'Checking…' : 'Connect'}</Button>
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">HubSpot</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">Keep HubSpot and PixlPush in step: HubSpot contacts become PixlPush users you can reach with campaigns and journeys, and new PixlPush users are added to HubSpot as contacts. Contacts sync about once an hour, and the Users page refreshes automatically.</Typography>
      </Box>
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(undefined)}>{error}</Alert>}

      {hubspot?.connected && (
        <Card className="saas-card">
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography fontWeight={700} fontSize="var(--fs-14)">HubSpot portal {hubspot.portalId}</Typography>
                <Typography color="text.secondary" fontSize="var(--fs-12)">{hubspot.authType === 'oauth' ? 'via HubSpot sign-in' : 'via Service Key'}</Typography>
                <SettingsStatus tone={hubspot.status === 'error' ? 'warning' : !hubspot.syncEnabled ? 'neutral' : 'success'}>
                  {hubspot.status === 'error' ? 'Needs attention' : !hubspot.syncEnabled ? 'Paused' : syncing ? 'Syncing' : 'Connected'}
                </SettingsStatus>
              </Stack>
              <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.5 }}>
                {hubspot.lastSyncedAt ? `Last sync ${new Date(hubspot.lastSyncedAt).toLocaleString()}: ` : 'Current sync: '}
                {hubspot.counts.created} added, {hubspot.counts.updated} updated, {hubspot.counts.skipped} skipped (no email or more than one match), {hubspot.counts.pushed ?? 0} sent to HubSpot.
              </Typography>
            </Box>
            <Button variant="outlined" disabled={!canEdit || !hubspot.syncEnabled || syncing || syncNow.isPending} onClick={() => run(() => syncNow.mutateAsync())}>{syncing ? 'Syncing…' : 'Sync now'}</Button>
          </Stack>
          {hubspot.lastError && <Alert severity="warning" sx={{ mt: 2 }}>{hubspot.lastError}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid #eeeaf3' }}>
            <FormControlLabel
              control={<Switch checked={hubspot.syncEnabled} disabled={!canEdit || setSyncEnabled.isPending} onChange={(_, on) => run(() => setSyncEnabled.mutateAsync(on))} />}
              label={<Typography fontSize="var(--fs-13)">Sync automatically</Typography>}
            />
            <Stack direction="row" gap={1}>
              {!replacing && <Button disabled={!canEdit} onClick={() => setReplacing(true)}>{oauthAvailable ? 'Reconnect' : 'Replace key'}</Button>}
              <Button color="error" disabled={!canEdit || disconnect.isPending} aria-haspopup="dialog" onClick={() => { setError(undefined); setDisconnectOpen(true); }}>Disconnect</Button>
            </Stack>
          </Stack>
        </Card>
      )}

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
          Disconnecting stops future HubSpot syncs. Users already synced stay in PixlPush.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </SidePanel>

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
      {hubspot && (!hubspot.connected || replacing) && oauthAvailable && oauthForm}
      {hubspot && (!hubspot.connected || replacing) && (!oauthAvailable || useKey) && form}

      <Card className="saas-card">
        <Typography fontWeight={700} fontSize="var(--fs-14)">What happens to your contacts</Typography>
        <Box component="ul" sx={{ pl: 2.5, mb: 0, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.5 } }}>
          <li>PixlPush checks for an existing user before adding a contact, to help avoid duplicates. Contacts without an email are skipped.</li>
          <li>Only empty profile details are filled in. Information already saved in PixlPush is kept as it is.</li>
          <li>If someone has unsubscribed from email in HubSpot, PixlPush marks them as not opted in. Sync never opts someone in.</li>
          <li>New contacts count toward your plan&apos;s user limit.</li>
          <li>PixlPush users with an email that HubSpot doesn&apos;t have yet, whether added in the app, imported or tracked by the SDK, are added to HubSpot as contacts with their name and country. Contacts already in HubSpot are linked, never changed.</li>
        </Box>
      </Card>

      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change the HubSpot connection.</Alert>}
      <Alert severity="info" icon={<LockRounded />}>HubSpot access is encrypted and stored securely by PixlPush and never shown again. Disconnecting removes PixlPush&apos;s access from HubSpot.</Alert>
    </Stack>
  );
}
