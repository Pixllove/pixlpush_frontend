'use client';

import {
  AddRounded,
  ArrowForwardRounded,
  BarChartRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  EditOutlined,
  FilterListRounded,
  MoreVertRounded,
  SearchRounded,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
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
  { id: 'welcome', name: 'Welcome newsletter', kind: 'popups', status: 'Active', created: '2 days ago', subscribers: 24, views: 1202, conversion: '2.0%', accent: 'var(--pp-accent)', style: 'split' },
  { id: 'launch', name: 'Product launch waitlist', kind: 'popups', status: 'Draft', created: '5 days ago', subscribers: 0, views: 0, conversion: '0%', accent: 'var(--pp-series-2)', style: 'center' },
  { id: 'footer', name: 'Footer subscribe form', kind: 'embedded', status: 'Active', created: '1 week ago', subscribers: 84, views: 4098, conversion: '2.1%', accent: 'var(--pp-info)', style: 'bar' },
  { id: 'holiday', name: 'Holiday offer', kind: 'promotions', status: 'Paused', created: '2 weeks ago', subscribers: 12, views: 884, conversion: '1.4%', accent: 'var(--pp-series-3)', style: 'split' },
];

const statusColor: Record<FormStatus, { color: string; background: string }> = {
  Draft: { color: 'var(--pp-text-2)', background: 'var(--pp-subtle)' },
  Active: { color: 'var(--pp-success)', background: 'var(--pp-success-soft)' },
  Paused: { color: 'var(--pp-warning)', background: 'var(--pp-warning-soft)' },
};

export default function FormsWorkspace() {
  const [kind, setKind] = useState<FormKind>('popups');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | FormStatus>('all');
  const [forms, setForms] = useState<FormItem[]>(demoForms);

  const renameForm = (id: string, name: string) => {
    setForms((current) => current.map((form) => form.id === id ? { ...form, name } : form));
  };

  const duplicateForm = (form: FormItem) => {
    setForms((current) => [{ ...form, id: `${form.id}-copy-${Date.now()}`, name: `${form.name} copy`, status: 'Draft', created: 'just now', subscribers: 0, views: 0, conversion: '0%' }, ...current]);
  };

  const deleteForm = (id: string) => {
    setForms((current) => current.filter((form) => form.id !== id));
  };

  const visibleForms = useMemo(() => forms.filter((form) => {
    const matchesKind = form.kind === kind;
    const matchesStatus = status === 'all' || form.status === status;
    const matchesSearch = !search.trim() || form.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesKind && matchesStatus && matchesSearch;
  }), [forms, kind, search, status]);

  return (
    <Box className="forms-workspace" sx={{ pb: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2} sx={{ mb: 2.5 }}>
        <Tabs value={kind} onChange={(_, value) => setKind(value)} aria-label="Form types" sx={{ mb: 0 }}>
          {tabs.map((tab) => {
            const count = forms.filter((form) => form.kind === tab.value).length;
            return <Tab key={tab.value} value={tab.value} label={<Stack direction="row" alignItems="center" gap={.75}><span>{tab.label}</span><Box component="span" sx={{ px: .75, py: .1, borderRadius: 99, background: 'var(--pp-subtle)', color: 'text.secondary', fontSize: 11 }}>{count}</Box></Stack>} />;
          })}
        </Tabs>
        <Button component={Link} href="/dashboard/forms/create" variant="contained" startIcon={<AddRounded />} endIcon={<ArrowForwardRounded />} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
          Create form
        </Button>
      </Stack>

      <Paper className="forms-list-panel" sx={{ overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} justifyContent="space-between" sx={{ px: { xs: 2, md: 2.5 }, py: 2 }}>
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

        {visibleForms.length > 0 ? visibleForms.map((form) => <FormRow form={form} key={form.id} onRename={renameForm} onDuplicate={duplicateForm} onDelete={deleteForm} />) : (
          <Box sx={{ px: 3, py: 9, textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5, borderRadius: '50%', color: 'var(--pp-accent)', background: 'var(--pp-accent-soft)' }}><SearchRounded /></Box>
            <Typography variant="h3" sx={{ mb: .5 }}>No forms found</Typography>
            <Typography color="text.secondary">Try another search or create a new {kind === 'popups' ? 'pop-up' : kind === 'embedded' ? 'embedded form' : 'promotion'}.</Typography>
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: { xs: 2, md: 2.5 }, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">Showing {visibleForms.length} of {forms.filter((form) => form.kind === kind).length} forms</Typography>
          <Stack direction="row" gap={1}><Button size="small" disabled>Previous</Button><Button size="small" disabled>Next</Button></Stack>
        </Stack>
      </Paper>

      <Paper sx={{ mt: 2, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
          <Stack direction="row" gap={1.5} alignItems="center">
            <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 1.75, color: 'var(--pp-accent)', background: 'var(--pp-accent-soft)' }}><BarChartRounded /></Box>
            <Box><Typography sx={{ fontWeight: 600 }}>Make every signup count</Typography><Typography variant="body2" color="text.secondary">Use form analytics to see which experiences convert best.</Typography></Box>
          </Stack>
          <Button variant="outlined" endIcon={<ArrowForwardRounded />}>View analytics</Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function FormRow({ form, onRename, onDuplicate, onDelete }: { form: FormItem; onRename: (id: string, name: string) => void; onDuplicate: (form: FormItem) => void; onDelete: (id: string) => void }) {
  const colors = statusColor[form.status];
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(form.name);
  const menuOpen = Boolean(menuAnchor);

  const closeMenu = () => setMenuAnchor(null);
  const openRename = () => {
    setRenameValue(form.name);
    setRenameOpen(true);
    closeMenu();
  };
  const saveRename = () => {
    const nextName = renameValue.trim();
    if (!nextName) return;
    onRename(form.id, nextName);
    setRenameOpen(false);
  };

  return (
    <>
      <Box className="form-row" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, 1.3fr) minmax(320px, 1fr)' }, gap: 2, alignItems: 'center', px: { xs: 2, md: 2.5 }, py: 2.25 }}>
        <Stack direction="row" gap={2} alignItems="center" minWidth={0}>
          <FormThumbnail form={form} />
          <Box minWidth={0}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography sx={{ fontWeight: 600 }} noWrap>{form.name}</Typography><Chip label={form.status} size="small" sx={{ height: 22, color: colors.color, background: colors.background, fontSize: 11, fontWeight: 600 }} /></Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>Created {form.created}</Typography>
            <Stack direction="row" gap={1} sx={{ mt: 1 }}>
              <Button component={Link} href="/dashboard/forms/create" size="small" variant={form.status === 'Draft' ? 'contained' : 'outlined'} endIcon={<ArrowForwardRounded />}>{form.status === 'Draft' ? 'Continue editing' : 'Overview'}</Button>
              <IconButton size="small" aria-label={`More actions for ${form.name}`} aria-expanded={menuOpen ? 'true' : undefined} onClick={(event) => setMenuAnchor(event.currentTarget)}><MoreVertRounded fontSize="small" /></IconButton>
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" divider={<Box sx={{ width: '1px', alignSelf: 'stretch', background: 'var(--pp-border)' }} />} justifyContent="space-around" sx={{ minHeight: 54 }}>
          <Metric label="Subscribers" value={form.subscribers.toLocaleString()} />
          <Metric label="Views" value={form.views.toLocaleString()} />
          <Metric label="Conversion" value={form.conversion} accent={form.conversion !== '0%'} />
        </Stack>
      </Box>

      <Menu anchorEl={menuAnchor} open={menuOpen} onClose={closeMenu} MenuListProps={{ 'aria-label': `Actions for ${form.name}` }}>
        <MenuItem onClick={openRename}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon><ListItemText>Rename</ListItemText></MenuItem>
        <MenuItem onClick={() => { onDuplicate(form); closeMenu(); }}><ListItemIcon><ContentCopyRounded fontSize="small" /></ListItemIcon><ListItemText>Duplicate</ListItemText></MenuItem>
        <Divider />
        <MenuItem onClick={() => { setDeleteOpen(true); closeMenu(); }} sx={{ color: 'var(--pp-error)' }}><ListItemIcon sx={{ color: 'inherit' }}><DeleteOutlineRounded fontSize="small" /></ListItemIcon><ListItemText>Delete</ListItemText></MenuItem>
      </Menu>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Rename form</DialogTitle><DialogContent><TextField autoFocus fullWidth label="Form name" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveRename(); }} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setRenameOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveRename} disabled={!renameValue.trim()}>Save</Button></DialogActions></Dialog>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Delete form?</DialogTitle><DialogContent><Typography color="text.secondary">This will remove “{form.name}” from the forms list. This frontend preview does not affect backend data.</Typography></DialogContent><DialogActions><Button onClick={() => setDeleteOpen(false)}>Cancel</Button><Button color="error" variant="contained" onClick={() => { onDelete(form.id); setDeleteOpen(false); }}>Delete</Button></DialogActions></Dialog>
    </>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <Box sx={{ px: { xs: 1, md: 2 }, minWidth: 0 }}><Typography variant="caption" color="text.secondary" noWrap>{label}</Typography><Typography sx={{ mt: .35, fontWeight: 600, color: accent ? 'var(--pp-success)' : 'text.primary' }}>{value}</Typography></Box>;
}

function FormThumbnail({ form }: { form: FormItem }) {
  return (
    <Box sx={{ width: 108, height: 86, flexShrink: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', borderRadius: 1.25, background: 'var(--pp-accent-soft)', border: '1px solid var(--pp-accent-line)' }}>
      {form.style === 'bar' ? <Box sx={{ width: '100%', px: 1, py: .7, background: 'var(--pp-surface)', borderTop: `4px solid ${form.accent}` }}><Box sx={{ width: '62%', height: 5, mb: .8, borderRadius: 2, background: 'var(--pp-text)' }} /><Box sx={{ width: '86%', height: 5, borderRadius: 2, background: 'var(--pp-border-strong)' }} /></Box> : <Box sx={{ width: 72, minHeight: 58, p: .9, borderRadius: .75, background: 'var(--pp-surface)' }}><Box sx={{ width: '65%', height: 5, mb: .7, borderRadius: 1, background: 'var(--pp-text)' }} /><Box sx={{ width: '88%', height: 4, mb: .8, borderRadius: 1, background: 'var(--pp-border-strong)' }} /><Box sx={{ width: '100%', height: 14, mb: .75, borderRadius: .4, background: 'var(--pp-subtle)' }} /><Box sx={{ width: '100%', height: 8, borderRadius: .5, background: form.accent }} /></Box>}
    </Box>
  );
}
