'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowForwardRounded, AutoGraphRounded, ContentCopyRounded, DeleteOutlineRounded, EditRounded, EmailRounded, GroupsRounded, PlayCircleOutlineRounded, RocketLaunchRounded, SendRounded } from '@mui/icons-material';
import { Box, Button, Card, Chip, Grid, IconButton, MenuItem, Select, Stack, Switch, Tab, Tabs, Typography } from '@mui/material';
import ReusableDataTable, { DataTableColumn } from './ReusableDataTable';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { Toast } from '@/components/auth/AuthFeedback';
import { journeysApi } from '@/lib/projects/api';
import { journeyError } from '@/lib/journeys';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import type { JourneyDisplayStatus, JourneyListItem } from '@/types/project';
import SearchField from './SearchField';

type JourneyStatus = 'Running' | 'Draft' | 'Paused' | 'Scheduled';
type JourneyRow = { id: string; name: string; status: JourneyStatus | 'Archived'; type: string; started: string; completed: string; created: string; live: string; paused: boolean; createdAt: string };

const statusLabel: Record<JourneyDisplayStatus, JourneyRow['status']> = { running: 'Running', scheduled: 'Scheduled', draft: 'Draft', paused: 'Paused', archived: 'Archived' };
const when = (value: string | null) => value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const toRow = (journey: JourneyListItem): JourneyRow => ({
  id: journey.id,
  name: journey.name,
  status: statusLabel[journey.displayStatus],
  type: journey.messageType === 'email' ? 'Email' : journey.messageType === 'push' ? 'Push' : journey.messageType === 'mixed' ? 'Email + Push' : '—',
  started: journey.started.toLocaleString('en-US'),
  completed: journey.completed.toLocaleString('en-US'),
  created: when(journey.createdAt),
  live: when(journey.activatedAt),
  paused: journey.displayStatus !== 'running' && journey.displayStatus !== 'scheduled',
  createdAt: journey.createdAt,
});

const guide = [
  ['1', 'Create templates', 'Design Email, Push or In-App messages you’ll use in your journeys.', EmailRounded],
  ['2', 'Start your journey', 'Give your journey a name, set a goal and choose the right type.', GroupsRounded],
  ['3', 'Select audience', 'Choose a Lifecycle Segment or Audience Group you want to target.', GroupsRounded],
  ['4', 'Add steps', 'Add Email, Push, In-App message, Delay or Condition steps to build your flow.', AutoGraphRounded],
  ['5', 'Add exit conditions', 'Define when users should exit the journey.', ArrowForwardRounded],
  ['6', 'Review & activate', 'Review your journey, test it and turn it on.', PlayCircleOutlineRounded],
] as const;

export default function JourneyWorkspace() {
  const router = useRouter();
  const [tab, setTab] = useState<'All' | JourneyStatus>('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'created' | 'name'>('created');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<JourneyRow | null>(null);
  const [notice, setNotice] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const { active } = useActiveProject();
  const projectId = active?.id;
  const queryClient = useQueryClient();
  // What the server was last asked for: set once the user pauses typing.
  const [term, setTerm] = useState('');
  const LIMIT = 25;
  // The tab and the search are answered by the server; `counts` fills the tab badges.
  const list = useQuery({
    queryKey: ['projects', projectId, 'journeys', 'list', tab, term, page],
    queryFn: () => journeysApi.list(projectId!, { status: tab === 'All' ? undefined : (tab.toLowerCase() as JourneyDisplayStatus), search: term || undefined, page, limit: LIMIT }),
    enabled: Boolean(projectId),
    // Kept only so the tab counts do not blink to zero while the next list loads; its rows are never shown.
    placeholderData: previous => previous,
  });
  // True while the rows on hand belong to another tab, search or page.
  // Also true from the first key typed, so the list reacts at once rather than after the pause and the request.
  const listLoading = list.isPending || list.isPlaceholderData || search.trim() !== term;
  const counts = list.data?.counts ?? {};
  const rows = useMemo(() => {
    const mapped = (list.isPlaceholderData ? [] : list.data?.items ?? []).map(toRow);
    return sort === 'name' ? [...mapped].sort((a, b) => a.name.localeCompare(b.name)) : mapped;
  }, [list.data, list.isPlaceholderData, sort]);
  const total = list.data?.total ?? 0;

  /** One row action at a time; the list is re-read after it. */
  const act = async (key: string, work: () => Promise<unknown>, done: string) => {
    if (busy || !projectId) return;
    setBusy(key);
    try {
      await work();
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'journeys'] });
      setNotice({ message: done, severity: 'success' });
    } catch (error) {
      setNotice({ message: journeyError(error), severity: 'error' });
    } finally {
      setBusy(null);
    }
  };
  const canToggle = (row: JourneyRow) => row.status === 'Running' || row.status === 'Scheduled' || row.status === 'Paused';
  /** The backend deletes drafts and stopped journeys only, so one that ran is stopped (archived) first. */
  const remove = (row: JourneyRow) => act(`delete-${row.id}`, async () => {
    if (row.status !== 'Draft' && row.status !== 'Archived') await journeysApi.action(projectId!, row.id, 'archive');
    await journeysApi.remove(projectId!, row.id);
  }, 'Journey deleted');
  const columns: DataTableColumn<JourneyRow>[] = [
    { key: 'name', label: 'Name', render: row => <Box><Typography fontSize={12} fontWeight={500}>{row.name}</Typography><Typography color="text.secondary" fontSize={11}>Automated journey</Typography></Box> },
    { key: 'status', label: 'Status', render: row => <Chip label={row.status} size="small" className={`journey-status-chip ${row.status.toLowerCase()}`} /> },
    { key: 'type', label: 'Message type', render: row => <Stack direction="row" alignItems="center" gap={.7} color="text.secondary" fontSize={11}>{row.type === 'Email' ? <EmailRounded fontSize="small" /> : <SendRounded fontSize="small" />}<span>{row.type}</span></Stack> },
    { key: 'paused', label: 'Pause / resume', render: row => <Stack direction="row" alignItems="center" gap={.3}><Switch disableRipple className="journey-switch" inputProps={{ 'aria-label': `${row.paused ? 'Resume' : 'Pause'} ${row.name}` }} checked={!row.paused} disabled={!canToggle(row) || Boolean(busy)} onChange={() => act(`toggle-${row.id}`, () => journeysApi.action(projectId!, row.id, row.paused ? 'resume' : 'pause'), row.paused ? 'Journey resumed' : 'Journey paused')} /><Typography fontSize={11} color={canToggle(row) ? '#4775de' : '#a59bb2'} fontWeight={500}>{row.paused ? 'Resume' : 'Pause'}</Typography></Stack> },
    { key: 'started', label: 'Started', align: 'right' },
    { key: 'completed', label: 'Completed', align: 'right' },
    { key: 'created', label: 'Created at', render: row => <Typography color="text.secondary" fontSize={11}>{row.created}</Typography> },
    { key: 'live', label: 'Went live', render: row => <Typography color="text.secondary" fontSize={11}>{row.live}</Typography> },
    { key: 'actions', label: 'Actions', align: 'right', render: row => <Stack direction="row" justifyContent="flex-end" className="email-table-row-actions"><IconButton size="small" className="edit-action" aria-label={`Edit ${row.name}`} onClick={() => router.push(`/dashboard/journeys/builder?id=${row.id}`)}><EditRounded fontSize="small" /></IconButton><IconButton size="small" className="duplicate-action" aria-label={`Duplicate ${row.name}`} disabled={Boolean(busy)} onClick={() => act(`duplicate-${row.id}`, () => journeysApi.action(projectId!, row.id, 'duplicate'), 'Journey duplicated as a draft')}><ContentCopyRounded fontSize="small" /></IconButton><IconButton size="small" className="delete-action" aria-label={`Delete ${row.name}`} disabled={Boolean(busy)} onClick={() => setToDelete(row)}><DeleteOutlineRounded fontSize="small" /></IconButton></Stack> },
  ];

  return <Stack gap={2.5} className="journey-workspace">
    <Stack direction="row" justifyContent="flex-end" alignItems="center"><Button variant="contained" startIcon={<RocketLaunchRounded />} onClick={() => router.push('/dashboard/journeys/create')}>Create journey</Button></Stack>

    <Card className="journey-guide-card"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}><Box><Typography variant="h3">Get started with Journey Automations <AutoGraphRounded className="journey-sparkle" /></Typography><Typography color="text.secondary" fontSize={12}>Build automated journeys that send the right message to the right user at the right time.</Typography></Box><Button size="small" variant="outlined">View documentation <ArrowForwardRounded fontSize="small" /></Button></Stack><Grid container spacing={1} sx={{ mt: 1 }}>{guide.map(([number, title, description, Icon], index) => <Grid item xs={12} sm={6} md={4} lg={2} key={title}><Box className="journey-guide-step"><Stack direction="row" alignItems="center" gap={.7}><Box className="journey-guide-number">{number}</Box><Box className="journey-guide-icon"><Icon fontSize="small" /></Box></Stack><Typography fontWeight={500} fontSize={12} sx={{ mt: 1.5 }}>{title}</Typography><Typography color="text.secondary" fontSize={11} lineHeight={1.45} sx={{ mt: .6 }}>{description}</Typography><ArrowForwardRounded className="journey-guide-arrow" /></Box>{index < guide.length - 1 && <Box className="journey-guide-connector" />}</Grid>)}</Grid></Card>

    <Card className="saas-card journey-table-card"><Tabs value={tab} onChange={(_, value) => { setTab(value); setPage(1); }}>{(['All', 'Running', 'Draft', 'Paused', 'Scheduled'] as const).map(item => <Tab key={item} value={item} label={<>{item}<Chip label={counts[item.toLowerCase()] ?? 0} size="small" /></>} />)}</Tabs><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} className="journey-toolbar"><SearchField value={search} onChange={setSearch} onSearch={(value) => { setTerm(value); setPage(1); }} placeholder="Search journeys" /><Select size="small" value={sort} onChange={event => setSort(event.target.value as 'created' | 'name')} className="filter-select"><MenuItem value="created">Date created</MenuItem><MenuItem value="name">Name</MenuItem></Select></Stack><ReusableDataTable columns={columns} rows={rows} totalCount={total} noun="journeys" showMenu={false} loading={listLoading} emptyMessage={list.isError ? journeyError(list.error, 'Journeys could not be loaded.') : 'No journeys yet.'} page={page} serverPageSize={LIMIT} hasPreviousPage={page > 1} hasNextPage={page * LIMIT < total} onPreviousPage={() => setPage(value => Math.max(1, value - 1))} onNextPage={() => setPage(value => value + 1)} /></Card>
    <DeleteConfirmDialog
      open={Boolean(toDelete)}
      onClose={() => setToDelete(null)}
      onConfirm={() => { const row = toDelete!; setToDelete(null); void remove(row); }}
      title={`Delete "${toDelete?.name ?? ''}"?`}
      description={toDelete && toDelete.status !== 'Draft' && toDelete.status !== 'Archived' ? 'This journey is stopped for everyone in it and then deleted. This cannot be undone.' : 'This cannot be undone.'}
    />
    <Toast message={notice?.message ?? null} severity={notice?.severity} onClose={() => setNotice(null)} />
  </Stack>;
}
