'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowBackRounded, WebhookRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, FormControlLabel, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import SettingsStatus from '@/components/dashboard/SettingsStatus';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useIntegration } from '@/hooks/projects/use-project-settings';
import { dataSyncApi } from '@/lib/projects/api';
import { integrationStatus } from './registry';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];
const STATUS_LABEL: Record<string, string> = { pending: 'Waiting', processing: 'Processing', applied: 'Synced', ignored_stale: 'Older update', ignored_deleted: 'Deleted user', failed: 'Failed', dead_letter: 'Failed' };
const errorText = (error: unknown) => (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';
const RESPONSE_EXAMPLE = `{
  "data": [{
    "id": "evt_1001",
    "event_name": "subscription_canceled",
    "user_id": "your-user-id",
    "time": "2026-11-23T12:00:00Z",
    "product_id": "premium_monthly",
    "user": { "email": "user@example.com", "email_consent": true }
  }],
  "next": null
}`;

export default function WebhookIntegration() {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));
  const { query, connect, setSyncEnabled, syncNow, disconnect } = useIntegration(projectId, 'webhook');
  const settings = query.data;
  const connected = settings?.connected ? settings : undefined;
  const status = integrationStatus(settings);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const records = useQuery({
    queryKey: ['projects', projectId, 'webhook-records'],
    enabled: Boolean(projectId && connected),
    refetchInterval: 15000,
    queryFn: async () => {
      const source = (await dataSyncApi.sources(projectId!)).find((item) => item.name === 'Webhook' && item.environment === 'production');
      return source ? (await dataSyncApi.records(projectId!, source.id)).items : [];
    },
  });

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); } catch (cause) { setError(errorText(cause)); }
  };
  const submit = () => run(async () => {
    await connect.mutateAsync({ url: url.trim(), token: token.trim() });
    setUrl('');
    setToken('');
    setReplacing(false);
  });

  return (
    <Stack gap={2.5}>
      <Button component={NextLink} href="/dashboard/integrations" startIcon={<ArrowBackRounded />} sx={{ alignSelf: 'flex-start' }}>All integrations</Button>
      {query.isError && <Alert severity="error">{errorText(query.error)}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change this connection.</Alert>}

      <Card className="saas-card">
        <Stack direction="row" gap={1.5} alignItems="flex-start">
          <Box className="integration-icon"><WebhookRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h3">Webhook</Typography>
              <Chip size="small" label="Your server → PixlPush" className="neutral-chip" />
              {status ? <SettingsStatus tone={status.tone}>{status.label}</SettingsStatus> : <Chip size="small" variant="outlined" label="Not connected" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">PixlPush reads users, lifecycle statuses, and events from your backend every 2 minutes.</Typography>
          </Box>
        </Stack>
      </Card>

      {query.isLoading && <Skeleton height={120} />}

      {connected && (
        <Card className="saas-card">
          <Stack gap={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{connected.accountLabel}</Typography>
                <Typography variant="caption" color="text.secondary">{connected.syncing && connected.syncEnabled ? 'Syncing…' : connected.lastSyncedAt ? `Last checked ${new Date(connected.lastSyncedAt).toLocaleString()}` : 'Waiting for first sync'}</Typography>
              </Box>
              <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={!canEdit || !connected.syncEnabled || syncNow.isPending} onClick={() => run(() => syncNow.mutateAsync())}>Sync now</Button>
            </Stack>
            {connected.lastError && <Alert severity="warning">{connected.lastError}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <FormControlLabel sx={{ ml: 0, gap: 1 }} label="Automatic sync" control={<Switch checked={connected.syncEnabled} disabled={!canEdit || setSyncEnabled.isPending} onChange={(_, on) => run(() => setSyncEnabled.mutateAsync(on))} />} />
              <Stack direction="row" gap={1}>
                <Button variant="outlined" disabled={!canEdit} onClick={() => setReplacing((value) => !value)}>{replacing ? 'Cancel' : 'Change URL or token'}</Button>
                {confirming
                  ? <Button color="error" variant="contained" disabled={disconnect.isPending} onClick={() => run(async () => { await disconnect.mutateAsync(); setConfirming(false); })}>Confirm disconnect</Button>
                  : <Button color="error" variant="outlined" disabled={!canEdit} onClick={() => setConfirming(true)}>Disconnect</Button>}
              </Stack>
            </Stack>
          </Stack>
        </Card>
      )}

      {settings && (!connected || replacing) && (
        <Card className="saas-card">
          <Stack gap={2} component="form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <Typography variant="h4">{connected ? 'Update connection' : 'Connect your backend'}</Typography>
            <TextField size="small" fullWidth label="Backend URL" placeholder="https://api.example.com/pixlpush/events" value={url} disabled={!canEdit} onChange={(event) => setUrl(event.target.value)} />
            <TextField size="small" fullWidth type="password" autoComplete="off" label="Auth token" helperText="Sent as a Bearer token. PixlPush encrypts it and never shows it again." value={token} disabled={!canEdit} onChange={(event) => setToken(event.target.value)} />
            <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={!canEdit || connect.isPending || !url.trim() || token.trim().length < 8}>{connect.isPending ? 'Checking…' : 'Connect'}</Button>
            <Box>
              <Typography variant="subtitle1">Your URL should return</Typography>
              <Typography variant="caption" color="text.secondary">PixlPush calls it with limit, since, and cursor query parameters. Each event needs a unique id and the time it happened.</Typography>
              <Box component="pre" sx={{ m: 0, mt: 0.75, p: 1.5, overflowX: 'auto', borderRadius: 1, bgcolor: 'action.hover', fontFamily: 'var(--pp-mono)', fontSize: 'var(--fs-12)' }}>{RESPONSE_EXAMPLE}</Box>
            </Box>
          </Stack>
        </Card>
      )}

      {connected && (
        <Card className="saas-card">
          <Stack gap={1}>
            <Typography variant="h4">Recent records</Typography>
            {records.data?.length ? records.data.slice(0, 10).map((record) => (
              <Stack key={record.id} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{record.recordType} · {record.externalUserId}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(record.receivedAt).toLocaleString()}</Typography>
                <Chip size="small" color={record.status === 'applied' ? 'success' : record.status === 'failed' || record.status === 'dead_letter' ? 'error' : 'default'} label={STATUS_LABEL[record.status] ?? record.status} />
              </Stack>
            )) : <Typography variant="body2" color="text.secondary">No records yet.</Typography>}
          </Stack>
        </Card>
      )}

      {connected && <Button component={NextLink} href="/dashboard/integrations/webhook/advanced" sx={{ alignSelf: 'flex-start' }}>Advanced tools</Button>}
    </Stack>
  );
}
