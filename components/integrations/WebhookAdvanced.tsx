'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowBackRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Skeleton, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import DataSyncImports from '@/components/dashboard/DataSyncImports';
import DataSyncMigrations from '@/components/dashboard/DataSyncMigrations';
import EmptyState from '@/components/dashboard/EmptyState';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { dataSyncApi } from '@/lib/projects/api';

const errorText = (error: unknown) => (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';
const TABS = [['imports', 'History imports'], ['migrations', 'Journey migration'], ['mapping', 'Field mapping'], ['segments', 'External segments'], ['protected', 'Protected events']] as const;

/** Occasional tools. Everyday setup stays on the Webhook integration page. */
export default function WebhookAdvanced() {
  const { active } = useActiveProject();
  const { account } = useCurrentUser();
  const projectId = active?.id;
  const canEdit = Boolean(active && ['owner', 'admin', 'developer'].includes(active.role));
  const canControl = Boolean(active && ['owner', 'admin'].includes(active.role));
  const client = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('imports');
  const [selectedId, setSelectedId] = useState('');
  const [configText, setConfigText] = useState('');
  const [eventsText, setEventsText] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const sources = useQuery({ queryKey: ['projects', projectId, 'data-sync', 'sources'], queryFn: () => dataSyncApi.sources(projectId!), enabled: Boolean(projectId) });
  const source = sources.data?.find((item) => item.id === selectedId) ?? sources.data?.[0];
  const mappings = useQuery({ queryKey: ['projects', projectId, 'data-sync', source?.id, 'mappings'], queryFn: () => dataSyncApi.mappings(projectId!, source!.id), enabled: Boolean(projectId && source && tab === 'mapping') });
  const segments = useQuery({ queryKey: ['projects', projectId, 'data-sync', 'segments'], queryFn: () => dataSyncApi.segments(projectId!), enabled: Boolean(projectId && tab === 'segments') });
  const events = useQuery({ queryKey: ['projects', projectId, 'server-only-events'], queryFn: () => dataSyncApi.serverOnlyEvents(projectId!), enabled: Boolean(projectId && tab === 'protected') });

  useEffect(() => {
    const current = mappings.data?.find((item) => item.status === 'active') ?? mappings.data?.[0];
    if (current) setConfigText(JSON.stringify(current.config, null, 2));
  }, [mappings.data]);
  useEffect(() => { if (events.data) setEventsText(events.data.events.join('\n')); }, [events.data]);

  const publish = useMutation({
    mutationFn: async () => {
      const draft = await dataSyncApi.createMapping(projectId!, source!.id, JSON.parse(configText));
      if (!draft.validation.valid) throw new Error(draft.validation.errors[0]?.message ?? 'This mapping is not valid.');
      return dataSyncApi.publishMapping(projectId!, source!.id, draft.version);
    },
    onSuccess: async () => { setError(''); setNotice('Mapping published.'); await mappings.refetch(); },
    onError: (cause) => setError(cause instanceof SyntaxError ? 'Mapping JSON is not valid.' : errorText(cause)),
  });
  const saveEvents = useMutation({
    mutationFn: () => dataSyncApi.setServerOnlyEvents(projectId!, [...new Set(eventsText.split('\n').map((item) => item.trim()).filter(Boolean))]),
    onSuccess: async () => { setError(''); setNotice('Protected events saved.'); await client.invalidateQueries({ queryKey: ['projects', projectId, 'server-only-events'] }); },
    onError: (cause) => setError(errorText(cause)),
  });
  const retire = useMutation({
    mutationFn: (id: string) => dataSyncApi.retireSegment(projectId!, id),
    onSuccess: () => segments.refetch(),
    onError: (cause) => setError(errorText(cause)),
  });

  return (
    <Stack gap={2.5}>
      <Button component={NextLink} href="/dashboard/integrations/webhook" startIcon={<ArrowBackRounded />} sx={{ alignSelf: 'flex-start' }}>Webhook</Button>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>{TABS.map(([value, label]) => <Tab key={value} value={value} label={label} />)}</Tabs>
      {tab === 'imports' && projectId && <DataSyncImports projectId={projectId} sources={sources.data ?? []} source={source} onSelectSource={setSelectedId} canControl={canControl} />}
      {tab === 'migrations' && projectId && <DataSyncMigrations projectId={projectId} accountId={account?.id} canEdit={canEdit} canControl={canControl} />}
      {tab === 'mapping' && (
        <Card className="saas-card">
          <Stack gap={1.5}>
            <Box><Typography variant="h4">Field mapping</Typography><Typography variant="body2" color="text.secondary">Optional. The webhook works without changes. Edit this only if your field names differ.</Typography></Box>
            {!source || mappings.isLoading ? <Skeleton height={160} /> : <TextField multiline minRows={12} label="Mapping JSON" value={configText} disabled={!canControl} onChange={(event) => setConfigText(event.target.value)} InputProps={{ sx: { fontFamily: 'var(--pp-mono)', fontSize: 'var(--fs-12)' } }} />}
            {canControl && <Button variant="contained" disabled={publish.isPending || !configText.trim()} sx={{ alignSelf: 'flex-start' }} onClick={() => publish.mutate()}>Publish mapping</Button>}
          </Stack>
        </Card>
      )}
      {tab === 'segments' && (
        <Card className="saas-card">
          {segments.isLoading ? <Skeleton height={64} /> : !segments.data?.length ? <EmptyState size="compact" title="No external segments yet" description="They appear after your server sends segment events." /> : segments.data.map((segment) => (
            <Stack key={segment.id} direction="row" gap={1} alignItems="center" sx={{ py: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2">{segment.displayName}</Typography><Typography variant="caption" color="text.secondary">{segment.memberCount} members · {segment.status}</Typography></Box>
              {canControl && segment.status === 'active' && <Button size="small" color="error" disabled={retire.isPending} onClick={() => retire.mutate(segment.id)}>Retire</Button>}
            </Stack>
          ))}
        </Card>
      )}
      {tab === 'protected' && (
        <Card className="saas-card">
          <Stack gap={1.5}>
            <Box><Typography variant="h4">Protected events</Typography><Typography variant="body2" color="text.secondary">Stop public SDK keys from sending these event names. Webhook events are always trusted.</Typography></Box>
            <TextField multiline minRows={6} label="Event names" helperText="One per line" value={eventsText} disabled={!canControl} onChange={(event) => setEventsText(event.target.value)} />
            {canControl && <Button variant="contained" disabled={saveEvents.isPending || events.isLoading} sx={{ alignSelf: 'flex-start' }} onClick={() => saveEvents.mutate()}>Save</Button>}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
