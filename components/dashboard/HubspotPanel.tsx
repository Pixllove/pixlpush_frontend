'use client';

import { useEffect, useState } from 'react';
import { LockRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useHubspotSettings } from '@/hooks/projects/use-project-settings';
import SettingsStatus from './SettingsStatus';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

const STEPS = [
  'In HubSpot, open Settings → Integrations → Private Apps (Development → Legacy apps in newer accounts) and create a private app.',
  'Under Scopes, add crm.objects.contacts.read. PixlPush only reads contacts.',
  'Create the app, copy its access token and paste it below.',
];

/** HubSpot contacts -> PixlPush users for the active Project. */
export default function HubspotPanel() {
  const { active } = useActiveProject();
  const { query, connect, setSyncEnabled, syncNow, disconnect } = useHubspotSettings(active?.id);
  const hubspot = query.data;
  const [token, setToken] = useState('');
  const [replacing, setReplacing] = useState(false);
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

  const form = (
    <Card className="saas-card">
      <Typography fontWeight={700} fontSize="var(--fs-14)">{hubspot?.connected ? 'Replace the access token' : 'Connect HubSpot'}</Typography>
      <Box component="ol" sx={{ pl: 2.5, my: 1.5, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.5 } }}>{STEPS.map((step) => <li key={step}>{step}</li>)}</Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField size="small" fullWidth type="password" label="Private app access token" placeholder="pat-…" value={token} onChange={(e) => setToken(e.target.value)} disabled={!canEdit || connect.isPending} autoComplete="off" />
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
              <Button color="error" disabled={!canEdit || disconnect.isPending} onClick={() => { if (window.confirm('Disconnect HubSpot? Users already synced stay in PixlPush.')) void run(() => disconnect.mutateAsync()); }}>Disconnect</Button>
            </Stack>
          </Stack>
        </Card>
      )}

      {hubspot && (!hubspot.connected || replacing) && form}

      <Card className="saas-card">
        <Typography fontWeight={700} fontSize="var(--fs-14)">How contacts are synced</Typography>
        <Box component="ul" sx={{ pl: 2.5, mb: 0, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.5 } }}>
          <li>Contacts are matched to existing users by their HubSpot ID, then by email. Contacts without an email are skipped.</li>
          <li>HubSpot only fills empty fields (name, country, time zone, language). Data from your app and SDK is never overwritten.</li>
          <li>Contacts who unsubscribed from email in HubSpot are marked as not consenting to email. The sync never adds consent.</li>
          <li>New users count toward your plan&apos;s reachable users.</li>
        </Box>
      </Card>

      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change the HubSpot connection.</Alert>}
      <Alert severity="info" icon={<LockRounded />}>The token is encrypted and stored only in the PixlPush backend. It is never shown again.</Alert>
    </Stack>
  );
}
