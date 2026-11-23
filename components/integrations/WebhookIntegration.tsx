'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowBackRounded, WebhookRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, FormControlLabel, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import SettingsStatus from '@/components/dashboard/SettingsStatus';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useIntegration } from '@/hooks/projects/use-project-settings';
import { dataSyncApi, type ServerDataType } from '@/lib/projects/api';
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

const DATA_TYPES: { key: ServerDataType; title: string; detail: string; tool?: string }[] = [
  { key: 'segments', title: 'Segments and membership', detail: 'Place users in lifecycle segments from your server.' },
  { key: 'activity', title: 'Historical activity', detail: 'Import past email and push activity. It is kept separate from PixlPush sends.', tool: 'Import history' },
  { key: 'journeys', title: 'Journeys and campaigns', detail: 'Stage journey participants without sending anything until you activate them.', tool: 'Open migration' },
];

function ServerData({ projectId, canControl }: { projectId: string; canControl: boolean }) {
  const client = useQueryClient();
  const key = ['projects', projectId, 'server-sync'];
  const status = useQuery({ queryKey: key, queryFn: () => dataSyncApi.serverSync(projectId) });
  const [found, setFound] = useState<{ sourceName: string; records: number }[]>();
  const [sourceName, setSourceName] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await work();
      await client.invalidateQueries({ queryKey: key });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };
  const types = status.data?.dataTypes ?? [];
  const segments = status.data?.segments ?? [];
  const toggle = (type: ServerDataType, on: boolean) => run(() => dataSyncApi.setServerDataTypes(projectId, on ? [...types, type] : types.filter((item) => item !== type)));
  const unmapped = (found ?? []).filter((item) => !segments.some((segment) => segment.sourceName === item.sourceName));

  return (
    <>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Card className="saas-card">
        <Stack gap={1.5}>
          <Box><Typography variant="h4">What to sync</Typography><Typography variant="body2" color="text.secondary">Turn on only what you use.</Typography></Box>
          {DATA_TYPES.map((type) => (
            <Stack key={type.key} direction="row" gap={1.5} alignItems="center" sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={600}>{type.title}</Typography><Typography variant="caption" color="text.secondary">{type.detail}</Typography></Box>
              {type.tool && types.includes(type.key) && <Button size="small" component={NextLink} href="/dashboard/integrations/webhook/advanced">{type.tool}</Button>}
              <Switch checked={types.includes(type.key)} disabled={!canControl || busy || status.isLoading} inputProps={{ 'aria-label': type.title }} onChange={(_, on) => void toggle(type.key, on)} />
            </Stack>
          ))}
        </Stack>
      </Card>

      {types.includes('segments') && (
        <Card className="saas-card">
          <Stack gap={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} justifyContent="space-between">
              <Box><Typography variant="h4">Lifecycle segments</Typography><Typography variant="body2" color="text.secondary">Map each segment your server sends to one PixlPush lifecycle segment. A user is in one at a time.</Typography></Box>
              <Button variant="outlined" sx={{ flexShrink: 0, alignSelf: 'flex-start' }} disabled={busy} onClick={() => void run(async () => setFound((await dataSyncApi.previewServerSegments(projectId)).segments))}>Check my feed</Button>
            </Stack>
            {segments.map((segment) => (
              <Stack key={segment.lifecycleSegmentId} direction="row" gap={1} alignItems="center" sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{segment.sourceName} → <Box component={NextLink} href={`/dashboard/users/segments/${segment.lifecycleSegmentId}?tab=segments`}>{segment.name}</Box></Typography>
                <Chip size="small" label={`${segment.userCount.toLocaleString()} users`} />
              </Stack>
            ))}
            {found && !unmapped.length && <Typography variant="caption" color="text.secondary">No new segments in the latest sample.</Typography>}
            {unmapped.length > 0 && (
              <Stack direction="row" gap={1} flexWrap="wrap">
                {unmapped.map((item) => <Chip key={item.sourceName} clickable label={`${item.sourceName} (${item.records})`} onClick={() => { setSourceName(item.sourceName); setName(item.sourceName); }} />)}
              </Stack>
            )}
            {canControl && (
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                <TextField size="small" fullWidth label="Your segment name" value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
                <TextField size="small" fullWidth label="PixlPush lifecycle segment" value={name} onChange={(event) => setName(event.target.value)} />
                <Button variant="contained" sx={{ flexShrink: 0 }} disabled={busy || !sourceName.trim() || !name.trim()} onClick={() => void run(async () => {
                  await dataSyncApi.mapServerSegment(projectId, { sourceName: sourceName.trim(), name: name.trim() });
                  setSourceName('');
                  setName('');
                  await client.invalidateQueries({ queryKey: ['projects', 'lifecycle-segments', projectId] });
                })}>Map segment</Button>
              </Stack>
            )}
          </Stack>
        </Card>
      )}
    </>
  );
}

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
              <Typography variant="h3">Server Sync</Typography>
              <Chip size="small" label="Your server → PixlPush" className="neutral-chip" />
              {status ? <SettingsStatus tone={status.tone}>{status.label}</SettingsStatus> : <Chip size="small" variant="outlined" label="Not connected" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">PixlPush reads the data you choose from your server every 2 minutes.</Typography>
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
            <Typography variant="h4">{connected ? 'Update connection' : 'Connect your server'}</Typography>
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

      {connected && projectId && <ServerData projectId={projectId} canControl={Boolean(active && ['owner', 'admin'].includes(active.role))} />}

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
