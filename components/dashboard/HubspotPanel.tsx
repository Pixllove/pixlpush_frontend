'use client';

import { useEffect, useState } from 'react';
import { LockRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, FormControlLabel, Link, Stack, Switch, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useHubspotSettings } from '@/hooks/projects/use-project-settings';
import SettingsStatus from './SettingsStatus';
import SidePanel from './SidePanel';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

/** HubSpot contacts -> PixlPush users for the active Project. */
export default function HubspotPanel() {
  const { active } = useActiveProject();
  const { query, connect, setSyncEnabled, syncNow, disconnect } = useHubspotSettings(active?.id);
  const hubspot = query.data;
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
  const submit = () => run(async () => {
    await connect.mutateAsync(token.trim());
    setToken('');
    setReplacing(false);
  });
  const confirmDisconnect = () => run(async () => {
    await disconnect.mutateAsync();
    setDisconnectOpen(false);
  });

  const form = (
    <Card className="saas-card">
      <Typography fontWeight={700} fontSize="var(--fs-14)">{hubspot?.connected ? 'Replace the Service Key' : 'Connect HubSpot'}</Typography>
      <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.75 }}>
        In HubSpot, create a Service Key. You may need your HubSpot admin to give you access to this option.
      </Typography>
      <Box component="ol" sx={{ pl: 2.5, my: 1.5, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.75 } }}>
        <li>Open <strong>Development → Keys → Service keys</strong>, then choose <strong>Create service key</strong>. In some accounts, Service Keys are under <strong>Settings → Integrations</strong>.</li>
        <li>Name the key (for example, <strong>PixlPush contacts</strong>) and allow only <strong>crm.objects.contacts.read</strong>. This lets PixlPush read contacts; it cannot edit them in HubSpot.</li>
        <li>Create the key, copy it, and paste it below. Keep the key private; PixlPush encrypts it and will not show it again.</li>
      </Box>
      <Link href="https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys" target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-block', mb: 1.5, fontSize: 'var(--fs-12)' }}>
        View HubSpot’s step-by-step guide with screenshots
      </Link>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField size="small" fullWidth type="password" label="HubSpot Service Key" placeholder="Starts with pat-…" value={token} onChange={(e) => setToken(e.target.value)} disabled={!canEdit || connect.isPending} autoComplete="off" />
        <Stack direction="row" gap={1}>
          {replacing && <Button onClick={() => { setReplacing(false); setToken(''); }}>Cancel</Button>}
          <Button variant="contained" disabled={!canEdit || token.trim().length < 20 || connect.isPending} onClick={submit} sx={{ whiteSpace: 'nowrap' }}>{connect.isPending ? 'Checking…' : 'Connect'}</Button>
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">HubSpot</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">Bring your HubSpot contacts into PixlPush as users, so you can reach them with campaigns and journeys. Contacts sync every hour.</Typography>
      </Box>
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(undefined)}>{error}</Alert>}

      {hubspot?.connected && (
        <Card className="saas-card">
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography fontWeight={700} fontSize="var(--fs-14)">HubSpot portal {hubspot.portalId}</Typography>
                <SettingsStatus tone={hubspot.status === 'error' ? 'warning' : !hubspot.syncEnabled ? 'neutral' : 'success'}>
                  {hubspot.status === 'error' ? 'Needs attention' : !hubspot.syncEnabled ? 'Paused' : syncing ? 'Syncing' : 'Connected'}
                </SettingsStatus>
              </Stack>
              <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.5 }}>
                {hubspot.lastSyncedAt ? `Last sync ${new Date(hubspot.lastSyncedAt).toLocaleString()}: ` : 'Current sync: '}
                {hubspot.counts.created} added, {hubspot.counts.updated} updated, {hubspot.counts.skipped} skipped (no email or more than one match).
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
              {!replacing && <Button disabled={!canEdit} onClick={() => setReplacing(true)}>Replace token</Button>}
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

      {hubspot && (!hubspot.connected || replacing) && form}

      <Card className="saas-card">
        <Typography fontWeight={700} fontSize="var(--fs-14)">What happens to your contacts</Typography>
        <Box component="ul" sx={{ pl: 2.5, mb: 0, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.5 } }}>
          <li>PixlPush checks for an existing user before adding a contact, to help avoid duplicates. Contacts without an email are skipped.</li>
          <li>Only empty profile details are filled in. Information already saved in PixlPush is kept as it is.</li>
          <li>If someone has unsubscribed from email in HubSpot, PixlPush marks them as not opted in. Sync never opts someone in.</li>
          <li>New contacts count toward your plan&apos;s user limit.</li>
        </Box>
      </Card>

      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change the HubSpot connection.</Alert>}
      <Alert severity="info" icon={<LockRounded />}>Your Service Key is encrypted and stored securely by PixlPush. For your security, it will not be shown again.</Alert>
    </Stack>
  );
}
