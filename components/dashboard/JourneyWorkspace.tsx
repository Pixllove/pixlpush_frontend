'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowForwardRounded, AutoGraphRounded, ContentCopyRounded, DeleteOutlineRounded, EditRounded, EmailRounded, GroupsRounded, PlayCircleOutlineRounded, RocketLaunchRounded, SendRounded } from '@mui/icons-material';
import { Box, Button, Card, Chip, Grid, IconButton, InputAdornment, MenuItem, Select, Stack, Switch, TextField, Typography } from '@mui/material';
import ReusableDataTable, { DataTableColumn } from './ReusableDataTable';

type JourneyStatus = 'Running' | 'Draft' | 'Paused' | 'Scheduled';
type JourneyRow = { id: string; name: string; status: JourneyStatus; type: string; started: string; completed: string; created: string; live: string; paused: boolean };

const guide = [
  ['1', 'Create templates', 'Design Email, Push or In-App messages you’ll use in your journeys.', EmailRounded],
  ['2', 'Start your journey', 'Give your journey a name, set a goal and choose the right type.', GroupsRounded],
  ['3', 'Select audience', 'Choose a Lifecycle Segment or Audience Group you want to target.', GroupsRounded],
  ['4', 'Add steps', 'Add Email, Push, In-App message, Delay or Condition steps to build your flow.', AutoGraphRounded],
  ['5', 'Add exit conditions', 'Define when users should exit the journey.', ArrowForwardRounded],
  ['6', 'Review & activate', 'Review your journey, test it and turn it on.', PlayCircleOutlineRounded],
] as const;

const journeyRows: JourneyRow[] = [
  { id: 'journey-paywall', name: 'Hot journey paywall drop', status: 'Running', type: 'Push', started: '6,951', completed: '5,824', created: 'Apr 1, 2026, 02:23 AM', live: 'Apr 2, 2026, 11:30 PM', paused: false },
  { id: 'journey-reactivation', name: 'Reactivation journey before...', status: 'Running', type: 'Push', started: '35,426', completed: '35,224', created: 'Mar 27, 2026, 10:30 PM', live: 'Mar 27, 2026, 10:50 PM', paused: false },
  { id: 'journey-onboarding', name: 'Onboarding journey users...', status: 'Running', type: 'Email', started: '58,735', completed: '53,862', created: 'Mar 27, 2026, 10:29 PM', live: 'Mar 27, 2026, 10:31 PM', paused: false },
  { id: 'journey-renewal', name: 'Subscription renewal', status: 'Paused', type: 'Email', started: '8,402', completed: '7,992', created: 'Mar 18, 2026, 08:14 AM', live: 'Mar 18, 2026, 08:30 AM', paused: true },
];

export default function JourneyWorkspace() {
  const router = useRouter();
  const [tab, setTab] = useState<'All' | JourneyStatus>('All');
  const [search, setSearch] = useState('');
  const rows = useMemo(() => journeyRows.filter(row => (tab === 'All' || row.status === tab) && row.name.toLowerCase().includes(search.toLowerCase())), [search, tab]);
  const columns: DataTableColumn<JourneyRow>[] = [
    { key: 'name', label: 'Name', render: row => <Box><Typography fontSize={12} fontWeight={900}>{row.name}</Typography><Typography color="text.secondary" fontSize={10}>Automated journey</Typography></Box> },
    { key: 'status', label: 'Status', render: row => <Chip label={row.status} size="small" className={row.status === 'Running' ? 'active-chip' : row.status === 'Paused' ? 'paused-chip' : 'neutral-chip'} /> },
    { key: 'type', label: 'Message type', render: row => <Stack direction="row" alignItems="center" gap={.7} color="text.secondary" fontSize={11}>{row.type === 'Email' ? <EmailRounded fontSize="small" /> : <SendRounded fontSize="small" />}<span>{row.type}</span></Stack> },
    { key: 'paused', label: 'Pause / resume', render: row => <Stack direction="row" alignItems="center" gap={.3}><Switch size="small" defaultChecked={!row.paused} /><Typography fontSize={11} color="#4775de" fontWeight={800}>{row.paused ? 'Resume' : 'Pause'}</Typography></Stack> },
    { key: 'started', label: 'Started', align: 'right' },
    { key: 'completed', label: 'Completed', align: 'right' },
    { key: 'created', label: 'Created at', render: row => <Typography color="text.secondary" fontSize={10}>{row.created}</Typography> },
    { key: 'live', label: 'Went live', render: row => <Typography color="text.secondary" fontSize={10}>{row.live}</Typography> },
    { key: 'actions', label: 'Actions', align: 'right', render: row => <Stack direction="row" justifyContent="flex-end" className="email-table-row-actions"><IconButton size="small" className="edit-action" aria-label={`Edit ${row.name}`}><EditRounded fontSize="small" /></IconButton><IconButton size="small" className="duplicate-action" aria-label={`Duplicate ${row.name}`}><ContentCopyRounded fontSize="small" /></IconButton><IconButton size="small" className="delete-action" aria-label={`Delete ${row.name}`}><DeleteOutlineRounded fontSize="small" /></IconButton></Stack> },
  ];

  return <Stack gap={2.5} className="journey-workspace">
    <Stack direction="row" justifyContent="flex-end" alignItems="center"><Button variant="contained" startIcon={<RocketLaunchRounded />} onClick={() => router.push('/dashboard/journeys/create')}>Create journey</Button></Stack>

    <Card className="journey-guide-card"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}><Box><Typography variant="h3">Get started with Journey Automations <AutoGraphRounded className="journey-sparkle" /></Typography><Typography color="text.secondary" fontSize={12}>Build automated journeys that send the right message to the right user at the right time.</Typography></Box><Button size="small" variant="outlined">View documentation <ArrowForwardRounded fontSize="small" /></Button></Stack><Grid container spacing={1} sx={{ mt: 1 }}>{guide.map(([number, title, description, Icon], index) => <Grid item xs={12} sm={6} md={4} lg={2} key={title}><Box className="journey-guide-step"><Stack direction="row" alignItems="center" gap={.7}><Box className="journey-guide-number">{number}</Box><Box className="journey-guide-icon"><Icon fontSize="small" /></Box></Stack><Typography fontWeight={900} fontSize={12} sx={{ mt: 1.5 }}>{title}</Typography><Typography color="text.secondary" fontSize={10} lineHeight={1.45} sx={{ mt: .6 }}>{description}</Typography><ArrowForwardRounded className="journey-guide-arrow" /></Box>{index < guide.length - 1 && <Box className="journey-guide-connector" />}</Grid>)}</Grid></Card>

    <Card className="saas-card journey-table-card"><Box className="journey-tabs">{(['All', 'Running', 'Draft', 'Paused', 'Scheduled'] as const).map(item => <Button key={item} onClick={() => setTab(item)} className={tab === item ? 'active' : ''}>{item}<Chip label={item === 'All' ? journeyRows.length : journeyRows.filter(row => row.status === item).length} size="small" /></Button>)}</Box><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} className="journey-toolbar"><TextField size="small" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name" className="table-search" InputProps={{ startAdornment: <InputAdornment position="start"><AutoGraphRounded fontSize="small" /></InputAdornment> }} /><Select size="small" defaultValue="created" className="filter-select"><MenuItem value="created">Date created</MenuItem><MenuItem value="name">Name</MenuItem></Select></Stack><ReusableDataTable columns={columns} rows={rows} totalCount={rows.length} noun="journeys" showMenu={false} /></Card>
  </Stack>;
}
