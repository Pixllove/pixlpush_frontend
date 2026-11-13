'use client';

import {
  AddRounded,
  ArrowForwardRounded,
  BarChartRounded,
  CheckCircleRounded,
  FilterListRounded,
  MoreVertRounded,
  PauseCircleOutlineRounded,
  PlayArrowRounded,
  SearchRounded,
  WebAssetRounded,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type FormKind = 'popups' | 'embedded' | 'promotions';
type FormStatus = 'Draft' | 'Active' | 'Paused';
type FormItem = {
  id: string;
  name: string;
  kind: FormKind;
  status: FormStatus;
  created: string;
  subscribers: number;
  views: number;
  conversion: string;
  accent: string;
  style: 'split' | 'center' | 'bar';
};

const tabs: Array<{ value: FormKind; label: string }> = [
  { value: 'popups', label: 'Pop-ups' },
  { value: 'embedded', label: 'Embedded forms' },
  { value: 'promotions', label: 'Promotions' },
];

const demoForms: FormItem[] = [
  { id: 'welcome', name: 'Welcome newsletter', kind: 'popups', status: 'Active', created: '2 days ago', subscribers: 24, views: 1202, conversion: '2.0%', accent: '#7c3aed', style: 'split' },
  { id: 'launch', name: 'Product launch waitlist', kind: 'popups', status: 'Draft', created: '5 days ago', subscribers: 0, views: 0, conversion: '0%', accent: '#f97316', style: 'center' },
  { id: 'footer', name: 'Footer subscribe form', kind: 'embedded', status: 'Active', created: '1 week ago', subscribers: 84, views: 4098, conversion: '2.1%', accent: '#0ea5e9', style: 'bar' },
  { id: 'holiday', name: 'Holiday offer', kind: 'promotions', status: 'Paused', created: '2 weeks ago', subscribers: 12, views: 884, conversion: '1.4%', accent: '#10b981', style: 'split' },
];

const statusColor: Record<FormStatus, { color: string; background: string }> = {
  Draft: { color: '#665c74', background: '#f3f1f6' },
  Active: { color: '#08734e', background: '#e7f6ef' },
  Paused: { color: '#9a5a0b', background: '#fff3dc' },
};

export default function FormsWorkspace() {
  const [kind, setKind] = useState<FormKind>('popups');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | FormStatus>('all');

  const visibleForms = useMemo(() => demoForms.filter((form) => {
    const matchesKind = form.kind === kind;
    const matchesStatus = status === 'all' || form.status === status;
    const matchesSearch = !search.trim() || form.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesKind && matchesStatus && matchesSearch;
  }), [kind, search, status]);

  return (
    <Box className="forms-workspace" sx={{ pb: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2} sx={{ mb: 2.5 }}>
        <Tabs value={kind} onChange={(_, value) => setKind(value)} aria-label="Form types" sx={{ mb: 0 }}>
          {tabs.map((tab) => {
            const count = demoForms.filter((form) => form.kind === tab.value).length;
            return <Tab key={tab.value} value={tab.value} label={<Stack direction="row" alignItems="center" gap={.75}><span>{tab.label}</span><Box component="span" sx={{ px: .75, py: .1, borderRadius: 99, background: '#eeeaf4', color: 'text.secondary', fontSize: 11 }}>{count}</Box></Stack>} />;
          })}
        </Tabs>
        <Button component={Link} href="/dashboard/forms/create" variant="contained" startIcon={<AddRounded />} endIcon={<ArrowForwardRounded />} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
          Create form
        </Button>
      </Stack>

      <Paper className="forms-list-panel" sx={{ border: '1px solid #eae6ef', borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} justifyContent="space-between" sx={{ px: { xs: 2, md: 2.5 }, py: 2, borderBottom: '1px solid #eeeaf3', background: '#fff' }}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} size="small" aria-label="Filter forms by status" sx={{ minWidth: 126 }}>
              <MenuItem value="all">All forms</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Draft">Drafts</MenuItem>
              <MenuItem value="Paused">Paused</MenuItem>
            </Select>
            <Button variant="outlined" size="small" startIcon={<FilterListRounded />}>Filters</Button>
          </Stack>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search forms"
            aria-label="Search forms"
            sx={{ width: { xs: '100%', md: 260 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded sx={{ color: 'text.disabled', fontSize: 19 }} /></InputAdornment> }}
          />
        </Stack>

        {visibleForms.length > 0 ? visibleForms.map((form) => <FormRow form={form} key={form.id} />) : (
          <Box sx={{ px: 3, py: 9, textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5, borderRadius: '50%', color: '#7050c8', background: '#f2edfc' }}><SearchRounded /></Box>
            <Typography variant="h3" sx={{ mb: .5 }}>No forms found</Typography>
            <Typography color="text.secondary">Try another search or create a new {kind === 'popups' ? 'pop-up' : kind === 'embedded' ? 'embedded form' : 'promotion'}.</Typography>
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderTop: visibleForms.length ? '1px solid #eeeaf3' : undefined, background: '#fff' }}>
          <Typography variant="body2" color="text.secondary">Showing {visibleForms.length} of {demoForms.filter((form) => form.kind === kind).length} forms</Typography>
          <Stack direction="row" gap={1}><Button size="small" disabled>Previous</Button><Button size="small" disabled>Next</Button></Stack>
        </Stack>
      </Paper>

      <Paper sx={{ mt: 2, p: { xs: 2, md: 2.5 }, border: '1px solid #eae6ef', borderRadius: 2, background: 'linear-gradient(115deg, #fbf9ff, #fffaf6)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
          <Stack direction="row" gap={1.5} alignItems="center">
            <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 1.75, color: '#6c42c7', background: '#eee8fc' }}><BarChartRounded /></Box>
            <Box><Typography sx={{ fontWeight: 700 }}>Make every signup count</Typography><Typography variant="body2" color="text.secondary">Use form analytics to see which experiences convert best.</Typography></Box>
          </Stack>
          <Button variant="outlined" endIcon={<ArrowForwardRounded />}>View analytics</Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function FormRow({ form }: { form: FormItem }) {
  const colors = statusColor[form.status];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, 1.3fr) minmax(320px, 1fr)' }, gap: 2, alignItems: 'center', px: { xs: 2, md: 2.5 }, py: 2.25, borderBottom: '1px solid #eeeaf3', '&:hover': { background: '#fdfcff' } }}>
      <Stack direction="row" gap={2} alignItems="center" minWidth={0}>
        <FormThumbnail form={form} />
        <Box minWidth={0}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography sx={{ fontWeight: 700 }} noWrap>{form.name}</Typography><Chip label={form.status} size="small" sx={{ height: 22, color: colors.color, background: colors.background, fontSize: 11, fontWeight: 700 }} /></Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>Created {form.created}</Typography>
          <Stack direction="row" gap={1} sx={{ mt: 1 }}>
            <Button component={Link} href="/dashboard/forms/create" size="small" variant={form.status === 'Draft' ? 'contained' : 'outlined'} endIcon={<ArrowForwardRounded />}>{form.status === 'Draft' ? 'Continue editing' : 'Overview'}</Button>
            <IconButton size="small" aria-label={`More actions for ${form.name}`}><MoreVertRounded fontSize="small" /></IconButton>
          </Stack>
        </Box>
      </Stack>
      <Stack direction="row" divider={<Box sx={{ width: '1px', alignSelf: 'stretch', background: '#eae6ef' }} />} justifyContent="space-around" sx={{ minHeight: 54 }}>
        <Metric label="Subscribers" value={form.subscribers.toLocaleString()} />
        <Metric label="Views" value={form.views.toLocaleString()} />
        <Metric label="Conversion" value={form.conversion} accent={form.conversion !== '0%'} />
      </Stack>
    </Box>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <Box sx={{ px: { xs: 1, md: 2 }, minWidth: 0 }}><Typography variant="caption" color="text.secondary" noWrap>{label}</Typography><Typography sx={{ mt: .35, fontWeight: 750, color: accent ? '#16825d' : 'text.primary' }}>{value}</Typography></Box>;
}

function FormThumbnail({ form }: { form: FormItem }) {
  return (
    <Box sx={{ width: 108, height: 86, flexShrink: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', borderRadius: 1.25, background: `${form.accent}16`, border: `1px solid ${form.accent}2e` }}>
      {form.style === 'bar' ? <Box sx={{ width: '100%', px: 1, py: .7, background: '#fff', borderTop: `4px solid ${form.accent}` }}><Box sx={{ width: '62%', height: 5, mb: .8, borderRadius: 2, background: '#31283b' }} /><Box sx={{ width: '86%', height: 5, borderRadius: 2, background: '#ded9e5' }} /></Box> : <Box sx={{ width: 72, minHeight: 58, p: .9, borderRadius: .75, background: '#fff', boxShadow: '0 5px 14px rgba(43,26,62,.12)' }}><Box sx={{ width: '65%', height: 5, mb: .7, borderRadius: 1, background: '#31283b' }} /><Box sx={{ width: '88%', height: 4, mb: .8, borderRadius: 1, background: '#ddd7e4' }} /><Box sx={{ width: '100%', height: 14, mb: .75, borderRadius: .4, background: '#f1eef5' }} /><Box sx={{ width: '100%', height: 8, borderRadius: .5, background: form.accent }} /></Box>}
      <Box sx={{ position: 'absolute', transform: 'translateY(0)', display: 'none' }} aria-hidden><CheckCircleRounded /></Box>
    </Box>
  );
}
