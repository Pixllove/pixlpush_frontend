'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddRounded, ContentCopyRounded, RefreshRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { dataSyncApi, type CreatedSyncCredential, type SyncMapping, type SyncSource } from '@/lib/projects/api';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import DataSyncImports from './DataSyncImports';
import DataSyncMigrations from './DataSyncMigrations';
import DataSyncSetupDialog from './DataSyncSetupDialog';
import EmptyState from './EmptyState';

const EDIT_ROLES = ['owner', 'admin', 'developer'];
const CONTROL_ROLES = ['owner', 'admin'];
const blankConfig = { fields: [], consent: [], segments: [], events: [] };
const errorText = (error: unknown) => (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export default function DataSyncPanel() {
  const { active } = useActiveProject();
  const { account } = useCurrentUser();
  const projectId = active?.id;
  const canEdit = Boolean(active && EDIT_ROLES.includes(active.role));
  const canControl = Boolean(active && CONTROL_ROLES.includes(active.role));
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('sources');
  const [setupOpen, setSetupOpen] = useState(false);
  const [credentialName, setCredentialName] = useState('');
  const [freshCredential, setFreshCredential] = useState<CreatedSyncCredential>();
  const [configText, setConfigText] = useState(pretty(blankConfig));
  const [sampleText, setSampleText] = useState('{\n  "attributes": {},\n  "consent": {}\n}');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof dataSyncApi.previewMapping>>>();
  const [eventsText, setEventsText] = useState('');
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookTopics, setWebhookTopics] = useState<string[]>(['record.applied']);
  const [selectedWebhookId, setSelectedWebhookId] = useState('');
  const [freshWebhookSecret, setFreshWebhookSecret] = useState('');
  const [deleteWebhookId, setDeleteWebhookId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const sourcesQuery = useQuery({ queryKey: ['projects', projectId, 'data-sync', 'sources'], queryFn: () => dataSyncApi.sources(projectId!), enabled: Boolean(projectId) });
  const sources = sourcesQuery.data ?? [];
  const source = sources.find((item) => item.id === selectedId) ?? sources[0];
  useEffect(() => { if (source && source.id !== selectedId) setSelectedId(source.id); }, [source?.id, selectedId]);
  const sourceKey = source?.id;
  const key = ['projects', projectId, 'data-sync', sourceKey];
  const credentialsQuery = useQuery({ queryKey: [...key, 'credentials'], queryFn: () => dataSyncApi.credentials(projectId!, sourceKey!), enabled: Boolean(projectId && sourceKey && canEdit) });
  const mappingsQuery = useQuery({ queryKey: [...key, 'mappings'], queryFn: () => dataSyncApi.mappings(projectId!, sourceKey!), enabled: Boolean(projectId && sourceKey) });
  const recordsQuery = useQuery({ queryKey: [...key, 'records'], queryFn: () => dataSyncApi.records(projectId!, sourceKey!), enabled: Boolean(projectId && sourceKey), refetchInterval: 15000 });
  const segmentsQuery = useQuery({ queryKey: ['projects', projectId, 'data-sync', 'segments'], queryFn: () => dataSyncApi.segments(projectId!), enabled: Boolean(projectId && tab === 'segments') });
  const eventsQuery = useQuery({ queryKey: ['projects', projectId, 'server-only-events'], queryFn: () => dataSyncApi.serverOnlyEvents(projectId!), enabled: Boolean(projectId && tab === 'protected-events') });
  const webhooksQuery = useQuery({ queryKey: [...key, 'webhooks'], queryFn: () => dataSyncApi.webhooks(projectId!, sourceKey!), enabled: Boolean(projectId && sourceKey && tab === 'webhooks') });
  const webhooks = webhooksQuery.data ?? [];
  useEffect(() => { if (webhooks.length && !webhooks.some((endpoint) => endpoint.id === selectedWebhookId)) setSelectedWebhookId(webhooks[0]!.id); }, [webhooks, selectedWebhookId]);
  const deliveriesQuery = useQuery({ queryKey: [...key, 'webhooks', selectedWebhookId, 'deliveries'], queryFn: () => dataSyncApi.webhookDeliveries(projectId!, selectedWebhookId), enabled: Boolean(projectId && selectedWebhookId && tab === 'webhooks'), refetchInterval: 15000 });
  useEffect(() => { if (canControl && new URLSearchParams(window.location.search).get('setup') === '1') setSetupOpen(true); }, [canControl]);
  useEffect(() => { if (eventsQuery.data) setEventsText(eventsQuery.data.events.join('\n')); }, [eventsQuery.data]);

  const refresh = async (section?: string) => {
    await client.invalidateQueries({ queryKey: section ? [...key, section] : key });
    await client.invalidateQueries({ queryKey: ['projects', projectId, 'data-sync', 'sources'] });
  };
  const credentialMutation = useMutation({ mutationFn: () => dataSyncApi.createCredential(projectId!, sourceKey!, credentialName.trim()), onSuccess: async (created) => { setCredentialName(''); setFreshCredential(created); await refresh('credentials'); } });
  const mappingMutation = useMutation({ mutationFn: async () => {
    const parsed = JSON.parse(configText);
    const draft = mappingsQuery.data?.find((item) => item.status === 'draft');
    return draft ? dataSyncApi.updateMapping(projectId!, sourceKey!, draft.version, parsed) : dataSyncApi.createMapping(projectId!, sourceKey!, parsed);
  }, onSuccess: async () => { setError(''); setNotice('Draft saved'); await refresh('mappings'); } });
  const publishMutation = useMutation({ mutationFn: async () => {
    const draft = mappingsQuery.data?.find((item) => item.status === 'draft');
    if (!draft) throw new Error('Save a draft mapping before publishing.');
    return dataSyncApi.publishMapping(projectId!, sourceKey!, draft.version);
  }, onSuccess: async () => { setNotice('Mapping published'); await refresh('mappings'); await refresh(); } });
  const previewMutation = useMutation({ mutationFn: async () => {
    const sample = JSON.parse(sampleText);
    return dataSyncApi.previewMapping(projectId!, sourceKey!, JSON.parse(configText), sample.attributes ?? {}, sample.consent ?? {});
  }, onSuccess: setPreview });
  const retryMutation = useMutation({ mutationFn: () => dataSyncApi.retryRecords(projectId!, sourceKey!), onSuccess: async ({ retried }) => { setNotice(`${retried} record${retried === 1 ? '' : 's'} queued for retry`); await refresh('records'); } });
  const sourceStatusMutation = useMutation({ mutationFn: (status: SyncSource['status']) => dataSyncApi.setSourceStatus(projectId!, sourceKey!, status), onSuccess: async () => { await refresh(); setNotice('Source status updated'); } });
  const retireMutation = useMutation({ mutationFn: (id: string) => dataSyncApi.retireSegment(projectId!, id), onSuccess: () => { void client.invalidateQueries({ queryKey: ['projects', projectId, 'data-sync', 'segments'] }); } });
  const eventMutation = useMutation({ mutationFn: () => dataSyncApi.setServerOnlyEvents(projectId!, [...new Set(eventsText.split('\n').map((event) => event.trim()).filter(Boolean))]), onSuccess: async ({ events }) => { setEventsText(events.join('\n')); setNotice('Protected events saved'); await client.invalidateQueries({ queryKey: ['projects', projectId, 'server-only-events'] }); } });

  useEffect(() => {
    if (mappingMutation.error || publishMutation.error || previewMutation.error || retryMutation.error || credentialMutation.error || sourceStatusMutation.error || retireMutation.error || eventMutation.error) {
      const cause = mappingMutation.error || publishMutation.error || previewMutation.error || retryMutation.error || credentialMutation.error || sourceStatusMutation.error || retireMutation.error || eventMutation.error;
      setError(errorText(cause));
    }
  }, [mappingMutation.error, publishMutation.error, previewMutation.error, retryMutation.error, credentialMutation.error, sourceStatusMutation.error, retireMutation.error, eventMutation.error]);
  useEffect(() => {
    const current = mappingsQuery.data?.find((item) => item.status === 'draft') ?? mappingsQuery.data?.find((item) => item.status === 'active');
    if (current) setConfigText(pretty(current.config));
  }, [sourceKey, mappingsQuery.data]);

  const records = recordsQuery.data?.items ?? [];
  const retryable = useMemo(() => records.some((record) => record.status === 'failed' || record.status === 'dead_letter'), [records]);
  const mappingRows = mappingsQuery.data ?? [];
  const errors = preview?.validation.errors ?? [];

  return <Stack gap={2.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={1.5}>
      <Box><Typography variant="h3">Data Sync</Typography><Typography color="text.secondary" variant="body2" sx={{ maxWidth: 760 }}>Connect a trusted server, map its records into PixlPush, and monitor sync status. Imported history stays out of journeys and message delivery.</Typography></Box>
      {canControl && <Button variant="contained" startIcon={<AddRounded />} sx={{ flexShrink: 0 }} onClick={() => setSetupOpen(true)}>Connect source</Button>}
    </Stack>
    {!canEdit && active && <Alert severity="info">Your project role can view Data Sync, but cannot change its settings.</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
    {sourcesQuery.isError && <Alert severity="error">{errorText(sourcesQuery.error)}</Alert>}
    <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
      {[['sources', 'Sources'], ['mappings', 'Mappings'], ['records', 'Records'], ['imports', 'Historical imports'], ['webhooks', 'Webhooks'], ['migrations', 'Migration runs'], ['segments', 'External segments'], ['protected-events', 'Protected events']].map(([value, label]) => <Tab key={value} value={value} label={label} />)}
    </Tabs>
    {tab === 'sources' && <Stack gap={2}>
      {sourcesQuery.isLoading ? <Card className="saas-card"><Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack></Card> : sources.length === 0 ? <Card className="saas-card"><EmptyState title="Connect your first data source" description="Send users, segments, purchases, and events from your server to PixlPush." action={canControl ? { label: 'Connect source', onClick: () => setSetupOpen(true) } : undefined} /></Card> : <>
        <TextField select size="small" label="Sync source" value={source?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)}>{sources.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.environment}</MenuItem>)}</TextField>
        {source && <Card className="saas-card"><Stack gap={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} alignItems={{ sm: 'center' }}><Box><Typography variant="h4">{source.name}</Typography><Typography color="text.secondary" variant="body2">{source.environment} · {source.status} · active mapping {source.activeMappingVersion ?? 'none'}</Typography></Box>{canEdit && <Button variant="outlined" onClick={() => sourceStatusMutation.mutate(source.status === 'active' ? 'paused' : 'active')}>{source.status === 'active' ? 'Pause source' : 'Resume source'}</Button>}</Stack>
          <Typography variant="body2" color="text.secondary">Pausing a source queues incoming records until it resumes. It does not remove existing records.</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>{[['Pending', source.records?.pending ?? 0], ['Applied', source.records?.applied ?? 0], ['Failed', (source.records?.failed ?? 0) + (source.records?.dead_letter ?? 0)], ['Stale', source.records?.ignored_stale ?? 0]].map(([label, count]) => <Box key={String(label)}><Typography color="text.secondary" variant="caption">{label}</Typography><Typography variant="h4">{count}</Typography></Box>)}</Box>
          {canControl && <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField size="small" label="Credential name" value={credentialName} onChange={(event) => setCredentialName(event.target.value)} inputProps={{ maxLength: 80 }} /><Button variant="outlined" startIcon={<AddRounded />} disabled={!credentialName.trim() || credentialMutation.isPending} onClick={() => credentialMutation.mutate()}>Create server key</Button></Stack>}
          {credentialsQuery.data?.map((credential) => <Stack key={credential.id} direction="row" gap={1} alignItems="center" sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2">{credential.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'var(--pp-mono)' }}>{credential.keyPrefix}… · {credential.revokedAt ? 'revoked' : credential.expiresAt ? `expires ${new Date(credential.expiresAt).toLocaleDateString()}` : 'no expiry'}</Typography></Box>{canControl && !credential.revokedAt && <Button size="small" color="error" onClick={async () => { await dataSyncApi.revokeCredential(projectId!, source.id, credential.id); await refresh('credentials'); }}>Revoke</Button>}</Stack>)}
        </Stack></Card>}
      </>}
    </Stack>}
    {tab === 'mappings' && <Stack gap={2}>
      {!source ? <Alert severity="info">Create or select a sync source to configure a mapping.</Alert> : <>
        <TextField select size="small" label="Sync source" value={source.id} onChange={(event) => setSelectedId(event.target.value)}>{sources.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.environment}</MenuItem>)}</TextField>
        <Card className="saas-card"><Stack gap={1.5}><Typography variant="h4">Mapping configuration</Typography><Typography variant="body2" color="text.secondary">Map profile fields, consent, segments, events and entitlements. Email addresses require an explicit email consent mapping.</Typography>
          <TextField multiline minRows={12} label="Mapping JSON" value={configText} onChange={(event) => setConfigText(event.target.value)} InputProps={{ sx: { fontFamily: 'var(--pp-mono)', fontSize: 12 } }} />
          {canEdit && <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="outlined" onClick={() => { try { setConfigText(pretty(JSON.parse(configText))); setError(''); } catch { setError('Mapping JSON is not valid.'); } }}>Format JSON</Button><Button variant="outlined" disabled={mappingMutation.isPending} onClick={() => mappingMutation.mutate()}>Save draft</Button><Button variant="contained" disabled={!canControl || publishMutation.isPending || !mappingRows.some((item) => item.status === 'draft')} onClick={() => publishMutation.mutate()}>Publish mapping</Button></Stack>}
          <Stack gap={1}><Typography variant="subtitle1">Preview a sample</Typography><Typography variant="caption" color="text.secondary">Enter a JSON object with optional attributes and consent objects.</Typography><TextField multiline minRows={5} label="Sample record" value={sampleText} onChange={(event) => setSampleText(event.target.value)} InputProps={{ sx: { fontFamily: 'var(--pp-mono)', fontSize: 12 } }} />{canEdit && <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={previewMutation.isPending} onClick={() => previewMutation.mutate()}>Preview mapping</Button>}</Stack>
          {preview && <Stack gap={1}><Alert severity={errors.length ? 'error' : 'success'}>{errors.length ? `${errors.length} validation error${errors.length === 1 ? '' : 's'}` : 'Mapping is valid for this sample'}{preview.recordError ? ` · ${preview.recordError.message}` : ''}</Alert>{[...errors, ...preview.validation.warnings].map((item, index) => <Typography key={`${item.code}-${index}`} variant="caption">{item.path}: {item.message}</Typography>)}<Box component="pre" sx={{ overflow: 'auto', p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'var(--pp-mono)', fontSize: 12 }}>{pretty({ fields: preview.fields, consent: preview.consent })}</Box></Stack>}
          {mappingRows.length > 0 && <Stack gap={0.5}><Typography variant="subtitle1">Versions</Typography>{mappingRows.map((row: SyncMapping) => <Typography key={row.version} variant="body2">v{row.version} · {row.status}{row.publishedAt ? ` · published ${new Date(row.publishedAt).toLocaleString()}` : ''}</Typography>)}</Stack>}
        </Stack></Card>
      </>}
    </Stack>}
    {tab === 'records' && <Stack gap={1.5}>
      {!source ? <Alert severity="info">Create or select a sync source to inspect records.</Alert> : <><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h4">Recent records</Typography><Stack direction="row" gap={1}><Button startIcon={<RefreshRounded />} onClick={() => void recordsQuery.refetch()}>Refresh</Button><Button variant="outlined" disabled={!canEdit || !retryable || retryMutation.isPending} onClick={() => retryMutation.mutate()}>Retry failed</Button></Stack></Stack>{recordsQuery.isError && <Alert severity="error">{errorText(recordsQuery.error)}</Alert>}<Card className="saas-card" sx={{ overflow: 'auto' }}>{records.map((record) => <Box key={record.id} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '130px minmax(120px,1fr) minmax(120px,1.5fr) minmax(120px,1fr) 140px' }, gap: 1, px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}><Typography variant="body2">{record.status}</Typography><Typography variant="caption" sx={{ fontFamily: 'var(--pp-mono)' }}>{record.recordType}</Typography><Typography variant="caption" sx={{ fontFamily: 'var(--pp-mono)' }}>{record.externalUserId}</Typography><Typography variant="caption" color="text.secondary">{new Date(record.receivedAt).toLocaleString()}</Typography><Typography variant="caption" color="error">{record.lastError ?? ''}</Typography></Box>)}{!records.length && <Box><Typography variant="body2" color="text.secondary">No records received yet.</Typography></Box>}</Card></>}
    </Stack>}
    {tab === 'imports' && projectId && <DataSyncImports projectId={projectId} sources={sources} source={source} onSelectSource={setSelectedId} canControl={canControl} />}
    {tab === 'webhooks' && <Stack gap={1.5}>
      <Box><Typography variant="h4">Webhooks</Typography><Typography variant="body2" color="text.secondary">Signed notifications are queued transactionally with sync outcomes. Failed deliveries retry automatically and can be replayed.</Typography></Box>
      {!source ? <Alert severity="info">Create or select a sync source to manage its webhooks.</Alert> : <>
        <TextField select size="small" label="Sync source" value={source.id} onChange={(event) => setSelectedId(event.target.value)}>{sources.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.environment}</MenuItem>)}</TextField>
        {canControl && <Card className="saas-card"><Stack gap={1.5}><Typography variant="subtitle1">Add an endpoint</Typography><TextField size="small" label="Endpoint name" value={webhookName} onChange={(event) => setWebhookName(event.target.value)} inputProps={{ maxLength: 80 }} /><TextField size="small" label="HTTPS endpoint URL" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://api.example.com/pixlpush" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>{[['record.applied', 'Record applied'], ['record.ignored_stale', 'Record ignored as stale'], ['record.ignored_deleted', 'Record ignored after deletion'], ['journey.entered', 'Journey entered'], ['journey.step_changed', 'Journey step changed'], ['journey.completed', 'Journey completed'], ['journey.exited', 'Journey exited'], ['journey.failed', 'Journey failed'], ['journey.paused', 'Journey paused'], ['journey.resumed', 'Journey resumed'], ['message.sent', 'Message sent'], ['message.failed', 'Message failed'], ['message.opened', 'Message opened'], ['message.clicked', 'Email clicked']].map(([value, label]) => <FormControlLabel key={value} control={<Checkbox checked={webhookTopics.includes(value)} onChange={(event) => setWebhookTopics((current) => event.target.checked ? [...current, value] : current.filter((topic) => topic !== value))} />} label={label} />)}</Box>
          <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={!webhookName.trim() || !webhookUrl.trim() || webhookTopics.length === 0} onClick={async () => { try { const created = await dataSyncApi.createWebhook(projectId!, source.id, { name: webhookName.trim(), url: webhookUrl.trim(), events: webhookTopics }); setFreshWebhookSecret(created.secret); setSelectedWebhookId(created.id); setWebhookName(''); setWebhookUrl(''); await client.invalidateQueries({ queryKey: [...key, 'webhooks'] }); } catch (cause) { setError(errorText(cause)); } }}>Create webhook</Button>
        </Stack></Card>}
        {freshWebhookSecret && <Alert severity="warning" onClose={() => setFreshWebhookSecret('')}><Stack gap={1}><Typography variant="body2">Copy this signing secret now. PixlPush cannot show it again.</Typography><Box component="code" sx={{ fontFamily: 'var(--pp-mono)', wordBreak: 'break-all' }}>{freshWebhookSecret}</Box><Button sx={{ alignSelf: 'flex-start' }} onClick={() => void navigator.clipboard.writeText(freshWebhookSecret)}>Copy secret</Button></Stack></Alert>}
        {webhooksQuery.isError && <Alert severity="error">{errorText(webhooksQuery.error)}</Alert>}
        <Card className="saas-card">{webhooks.map((endpoint) => <Stack key={endpoint.id} direction={{ xs: 'column', md: 'row' }} gap={1} alignItems={{ md: 'center' }} sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2">{endpoint.name} · {endpoint.status}</Typography><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{endpoint.url} · {endpoint.events.join(', ')}</Typography></Box><Button size="small" variant={selectedWebhookId === endpoint.id ? 'contained' : 'outlined'} onClick={() => setSelectedWebhookId(endpoint.id)}>Deliveries</Button>{canEdit && <Button size="small" onClick={async () => { try { await dataSyncApi.setWebhookStatus(projectId!, endpoint.id, endpoint.status === 'active' ? 'paused' : 'active'); await client.invalidateQueries({ queryKey: [...key, 'webhooks'] }); } catch (cause) { setError(errorText(cause)); } }}>{endpoint.status === 'active' ? 'Pause' : 'Resume'}</Button>}{canControl && <Button size="small" color="error" onClick={() => setDeleteWebhookId(endpoint.id)}>Delete</Button>}</Stack>)}{webhooksQuery.isSuccess && webhooks.length === 0 && <Box><Typography variant="body2" color="text.secondary">No webhook endpoints configured.</Typography></Box>}</Card>
        {selectedWebhookId && <Stack gap={1}><Typography variant="subtitle1">Recent deliveries</Typography>{deliveriesQuery.isError && <Alert severity="error">{errorText(deliveriesQuery.error)}</Alert>}<Card className="saas-card">{(deliveriesQuery.data ?? []).map((delivery) => <Stack key={delivery.id} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}><Box sx={{ flex: 1 }}><Typography variant="body2">{delivery.topic} · {delivery.status}</Typography><Typography variant="caption" color="text.secondary">{new Date(delivery.createdAt).toLocaleString()} · {delivery.attempts} attempts{delivery.responseStatus ? ` · HTTP ${delivery.responseStatus}` : ''}{delivery.lastError ? ` · ${delivery.lastError}` : ''}</Typography></Box>{canControl && delivery.status === 'dead_letter' && <Button size="small" onClick={async () => { try { await dataSyncApi.replayWebhook(projectId!, selectedWebhookId, delivery.id); await client.invalidateQueries({ queryKey: [...key, 'webhooks', selectedWebhookId, 'deliveries'] }); } catch (cause) { setError(errorText(cause)); } }}>Replay</Button>}</Stack>)}{deliveriesQuery.isSuccess && deliveriesQuery.data.length === 0 && <Box><Typography variant="body2" color="text.secondary">No deliveries yet.</Typography></Box>}</Card></Stack>}
      </>}
      <Dialog open={Boolean(deleteWebhookId)} onClose={() => setDeleteWebhookId('')} maxWidth="xs" fullWidth><DialogTitle>Delete this webhook endpoint?</DialogTitle><DialogContent><Typography variant="body2">Pending deliveries and delivery history for this endpoint will be removed.</Typography></DialogContent><DialogActions><Button onClick={() => setDeleteWebhookId('')}>Cancel</Button><Button color="error" variant="contained" onClick={async () => { try { await dataSyncApi.deleteWebhook(projectId!, deleteWebhookId); setDeleteWebhookId(''); await client.invalidateQueries({ queryKey: [...key, 'webhooks'] }); } catch (cause) { setError(errorText(cause)); } }}>Delete endpoint</Button></DialogActions></Dialog>
    </Stack>}
    {tab === 'migrations' && projectId && <DataSyncMigrations projectId={projectId} accountId={account?.id} canEdit={canEdit} canControl={canControl} />}
    {tab === 'segments' && <Stack gap={1.5}><Typography variant="h4">External segments</Typography><Typography variant="body2" color="text.secondary">Memberships and transition history are synced separately from PixlPush lifecycle segments.</Typography>{segmentsQuery.isError && <Alert severity="error">{errorText(segmentsQuery.error)}</Alert>}<Card className="saas-card">{(segmentsQuery.data ?? []).map((segment) => <Stack key={segment.id} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}><Box sx={{ flex: 1 }}><Typography variant="body2">{segment.displayName}</Typography><Typography variant="caption" color="text.secondary">{segment.namespace}/{segment.key} · {segment.source.name} · {segment.memberCount} members</Typography></Box><Typography variant="caption">{segment.status}</Typography>{canControl && segment.status === 'active' && <Button size="small" color="error" onClick={() => retireMutation.mutate(segment.id)}>Retire</Button>}</Stack>)}{segmentsQuery.isSuccess && segmentsQuery.data.length === 0 && <Box><Typography variant="body2" color="text.secondary">No external segments have been synced.</Typography></Box>}</Card></Stack>}
    {tab === 'protected-events' && <Stack gap={1.5}><Typography variant="h4">Server-only SDK events</Typography><Typography variant="body2" color="text.secondary">Events in this list are rejected from public SDK keys. A server identity secret must be enabled before you can protect events.</Typography>{eventsQuery.isError && <Alert severity="error">{errorText(eventsQuery.error)}</Alert>}<TextField multiline minRows={7} label="Event names" helperText="One event name per line, up to 100." value={eventsText} onChange={(event) => setEventsText(event.target.value)} disabled={!canControl} InputProps={{ sx: { fontFamily: 'var(--pp-mono)', fontSize: 12 } }} />{canControl && <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={eventMutation.isPending || eventsQuery.isLoading} onClick={() => eventMutation.mutate()}>Save protected events</Button>}</Stack>}
    {projectId && <DataSyncSetupDialog open={setupOpen} projectId={projectId} onClose={() => setSetupOpen(false)} onCreated={async (created) => { setSelectedId(created.id); await refresh(); }} />}
    {freshCredential && <Alert severity="warning" onClose={() => setFreshCredential(undefined)}><Stack gap={1}><Typography variant="body2">Copy this server key now. PixlPush cannot show it again.</Typography><Box component="code" sx={{ fontFamily: 'var(--pp-mono)', wordBreak: 'break-all' }}>{freshCredential.key}</Box><Button startIcon={<ContentCopyRounded />} sx={{ alignSelf: 'flex-start' }} onClick={() => void navigator.clipboard.writeText(freshCredential.key)}>Copy key</Button></Stack></Alert>}
  </Stack>;
}
