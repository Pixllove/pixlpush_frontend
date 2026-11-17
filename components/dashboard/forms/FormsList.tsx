'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AddRounded, BarChartRounded, ContentCopyRounded, DeleteOutlineRounded, DynamicFormOutlined, EditOutlined, MoreVertRounded } from '@mui/icons-material';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem,
  Paper, Skeleton, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';
import EmptyState, { listEmpty } from '@/components/dashboard/EmptyState';
import SearchField from '@/components/dashboard/SearchField';
import { deleteForm, duplicateForm, formsKeys, listForms } from '@/lib/forms';
import { formKinds, kindLabel, kindPlural, publishProblems, type FormDraft, type FormKind, type FormStatus } from './model';
import { FormThumbnail, StatusChip, useNotice, useSaveForm } from './shared';

const PAGE_SIZE = 10;
const tabLabel: Record<FormKind, string> = { popup: 'Pop-ups', embedded: 'Embedded forms', promotion: 'Promotions' };

export const conversion = (form: FormDraft) => (form.stats.views ? `${((form.stats.subscribers / form.stats.views) * 100).toFixed(1)}%` : '—');
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function FormsList() {
  const client = useQueryClient();
  const forms = useQuery({ queryKey: formsKeys.all, queryFn: listForms });
  const [kind, setKind] = useState<FormKind>('popup');
  const [status, setStatus] = useState<'all' | FormStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [notice, notify] = useNotice();

  const all = forms.data ?? [];
  const ofKind = all.filter((form) => form.kind === kind);
  const visible = ofKind.filter((form) => (status === 'all' || form.status === status) && form.name.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const shown = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const reset = () => setPage(0);

  return (
    <Box className="pp-forms">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
        <Tabs value={kind} onChange={(_, value) => { setKind(value); reset(); }} aria-label="Form types" variant="scrollable">
          {formKinds.map((item) => <Tab key={item} value={item} label={<>{tabLabel[item]}<Chip size="small" label={all.filter((form) => form.kind === item).length} /></>} />)}
        </Tabs>
        <Button component={Link} href={`/dashboard/forms/create?kind=${kind}`} variant="contained" startIcon={<AddRounded />}>Create {kindLabel[kind].toLowerCase()}</Button>
      </Stack>

      <Paper className="pp-forms-panel">
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} justifyContent="space-between" className="pp-forms-toolbar">
          <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); reset(); }} sx={{ minWidth: 160 }}>
            <MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="draft">Draft</MenuItem><MenuItem value="paused">Paused</MenuItem>
          </TextField>
          <SearchField placeholder={`Search ${kindPlural[kind]}`} value={search} onChange={(value) => { setSearch(value); reset(); }} />
        </Stack>

        {forms.isPending ? (
          <Stack gap={1} sx={{ p: 2 }}>{[0, 1, 2].map((row) => <Skeleton key={row} variant="rounded" height={96} />)}</Stack>
        ) : shown.length === 0 ? (
          <Box sx={{ py: 6 }}>
            <EmptyState {...listEmpty({
              icon: <DynamicFormOutlined />, noun: kindPlural[kind], error: forms.isError && 'Forms could not be loaded', onRetry: () => void forms.refetch(),
              search: search || (status !== 'all' ? statusFilterLabel(status) : ''), onClear: () => { setSearch(''); setStatus('all'); },
              description: kind === 'embedded' ? 'Add a signup form to any page of your site.' : kind === 'promotion' ? 'Announce an offer or event to your visitors.' : 'Collect subscribers with a well-timed pop-up.',
              create: { label: `Create ${kindLabel[kind].toLowerCase()}`, href: `/dashboard/forms/create?kind=${kind}` },
            })} />
          </Box>
        ) : (
          <Box component="ul" className="pp-forms-rows" aria-label={tabLabel[kind]}>
            {shown.map((form) => <FormRow key={form.id} form={form} notify={notify} onChanged={() => void client.invalidateQueries({ queryKey: formsKeys.all })} />)}
          </Box>
        )}

        {visible.length > 0 && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" className="pp-forms-footer">
            <Typography color="text.secondary" fontSize="var(--fs-13)">{page * PAGE_SIZE + 1}–{Math.min(visible.length, (page + 1) * PAGE_SIZE)} of {visible.length}</Typography>
            <Stack direction="row" gap={1}>
              <Button size="small" variant="outlined" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="small" variant="outlined" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </Stack>
          </Stack>
        )}
      </Paper>
      {notice}
    </Box>
  );
}

const statusFilterLabel = (status: FormStatus) => ({ active: 'Active', draft: 'Draft', paused: 'Paused' })[status];

function FormRow({ form, notify, onChanged }: { form: FormDraft; notify: (message: string) => void; onChanged: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(form.name);
  const save = useSaveForm();
  const duplicate = useMutation({ mutationFn: () => duplicateForm(form.id), onSuccess: () => { onChanged(); notify('Form duplicated'); } });
  const remove = useMutation({ mutationFn: () => deleteForm(form.id), onSuccess: () => { setDeleting(false); onChanged(); notify('Form deleted'); } });
  const problems = publishProblems(form);
  const live = form.status === 'active';
  const editHref = `/dashboard/forms/${form.id}/edit?step=${form.status === 'draft' ? 'design' : 'editor'}`;

  return (
    <Box component="li" className="pp-forms-row">
      <Link href={`/dashboard/forms/${form.id}`} className="pp-forms-row-thumb" aria-label={`Open ${form.name}`}><FormThumbnail draft={form} /></Link>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Typography component={Link} href={`/dashboard/forms/${form.id}`} className="pp-forms-row-name" noWrap>{form.name}</Typography>
          <StatusChip status={form.status} />
        </Stack>
        <Typography color="text.secondary" fontSize="var(--fs-13)">Created {formatDate(form.createdAt)} · Updated {formatDate(form.updatedAt)}</Typography>
        <Stack direction="row" gap={1} sx={{ mt: 1 }} alignItems="center">
          <Button size="small" variant={form.status === 'draft' ? 'contained' : 'outlined'} component={Link} href={form.status === 'draft' ? editHref : `/dashboard/forms/${form.id}`}>{form.status === 'draft' ? 'Continue editing' : 'Overview'}</Button>
          <Tooltip title="More actions"><IconButton aria-label={`More actions for ${form.name}`} aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}><MoreVertRounded /></IconButton></Tooltip>
        </Stack>
      </Box>
      <Box className="pp-forms-row-stats">
        <Metric label="Views" value={form.stats.views.toLocaleString()} />
        <Metric label="Subscribers" value={form.stats.subscribers.toLocaleString()} />
        <Metric label="Conversion" value={conversion(form)} />
      </Box>
      <Tooltip title={!live && problems.length ? problems[0] : live ? 'Pause form' : 'Make form live'}>
        <span className="pp-forms-row-switch">
          <Switch checked={live} disabled={(!live && problems.length > 0) || save.isPending} inputProps={{ 'aria-label': `${form.name} is live` }}
            onChange={(event) => save.mutate({ ...form, status: event.target.checked ? 'active' : 'paused' }, { onSuccess: () => notify(event.target.checked ? 'Form is live' : 'Form paused') })} />
        </span>
      </Tooltip>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem component={Link} href={editHref}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon><ListItemText>Edit</ListItemText></MenuItem>
        <MenuItem onClick={() => { setName(form.name); setRenaming(true); setAnchor(null); }}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon><ListItemText>Rename</ListItemText></MenuItem>
        <MenuItem onClick={() => { duplicate.mutate(); setAnchor(null); }}><ListItemIcon><ContentCopyRounded fontSize="small" /></ListItemIcon><ListItemText>Duplicate</ListItemText></MenuItem>
        <MenuItem component={Link} href="/dashboard/analytics"><ListItemIcon><BarChartRounded fontSize="small" /></ListItemIcon><ListItemText>Analytics</ListItemText></MenuItem>
        <Divider />
        <MenuItem onClick={() => { setDeleting(true); setAnchor(null); }} className="pp-menu-danger"><ListItemIcon><DeleteOutlineRounded fontSize="small" /></ListItemIcon><ListItemText>Delete</ListItemText></MenuItem>
      </Menu>

      <Dialog open={renaming} onClose={() => setRenaming(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) save.mutate({ ...form, name }, { onSuccess: () => { setRenaming(false); notify('Form renamed'); } }); }}>
          <DialogTitle>Rename form</DialogTitle>
          <DialogContent><TextField autoFocus fullWidth label="Form name" value={name} onChange={(event) => setName(event.target.value)} error={!name.trim()} helperText={name.trim() ? undefined : 'Enter a name.'} sx={{ mt: 1 }} /></DialogContent>
          <DialogActions><Button onClick={() => setRenaming(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={!name.trim() || save.isPending}>Save</Button></DialogActions>
        </Box>
      </Dialog>
      <DeleteConfirmDialog open={deleting} loading={remove.isPending} onClose={() => setDeleting(false)} onConfirm={() => remove.mutate()} title={`Delete “${form.name}”?`} description={live ? 'The form is live: it stops showing on your site immediately. This cannot be undone.' : 'This cannot be undone.'} />
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Box><Typography className="pp-forms-metric-label">{label}</Typography><Typography className="pp-forms-metric-value">{value}</Typography></Box>;
}
