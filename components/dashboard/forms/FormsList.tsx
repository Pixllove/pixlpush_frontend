'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AddRounded, ContentCopyRounded, DeleteOutlineRounded, DynamicFormOutlined, EditOutlined, MoreVertRounded, VisibilityOutlined } from '@mui/icons-material';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem,
  Paper, Skeleton, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';
import EmptyState, { listEmpty } from '@/components/dashboard/EmptyState';
import SearchField from '@/components/dashboard/SearchField';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { deleteForm, duplicateForm, formsKeys, listForms, setFormStatus, type FormsSort } from '@/lib/forms';
import { publishProblems, type FormDraft, type FormKind, type FormStatus } from './model';
import { FormPreview } from './FormEditor';
import { FormThumbnail, StatusChip, useNotice, useSaveForm } from './shared';

const PAGE_SIZE = 10;

export const conversion = (form: FormDraft) => (form.stats.views ? `${((form.stats.subscribers / form.stats.views) * 100).toFixed(1)}%` : '—');
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function FormsList() {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const client = useQueryClient();
  const kind: FormKind = 'popup';
  const [sort, setSort] = useState<FormsSort>('newest');
  const [search, setSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [page, setPage] = useState(0);
  const [notice, notify] = useNotice();
  const params = { type: kind, search: querySearch || undefined, sort, page: page + 1, limit: PAGE_SIZE };
  const forms = useQuery({ queryKey: formsKeys.list(projectId ?? '', params), queryFn: () => listForms(projectId!, params), enabled: Boolean(projectId), placeholderData: keepPreviousData });
  const shown = forms.data?.items ?? [];
  const total = forms.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const reset = () => { setPage(0); setSelected(new Set()); };
  const allSelected = shown.length > 0 && shown.every((form) => selected.has(form.id));
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next; });
  const removeSelected = useMutation({
    // No bulk endpoint: a page holds at most PAGE_SIZE forms, so one request each is fine.
    mutationFn: async () => (await Promise.allSettled([...selected].map((id) => deleteForm(id, projectId!)))).filter((result) => result.status === 'rejected').length,
    onSuccess: (failed) => {
      const deleted = selected.size - failed;
      setBulkDeleting(false);
      setSelected(new Set());
      void client.invalidateQueries({ queryKey: formsKeys.all });
      notify(failed ? `${deleted} deleted, ${failed} could not be deleted. Try again.` : `${deleted} form${deleted === 1 ? '' : 's'} deleted`);
    },
  });

  return (
    <Box className="pp-forms">
      <Stack className="pp-forms-header" direction="row" justifyContent="flex-end">
        <Button className="pp-forms-create-button" component={Link} href="/dashboard/forms/create" variant="contained" startIcon={<AddRounded />}>Create form</Button>
      </Stack>

      <Paper className="pp-forms-panel">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} justifyContent="flex-end" alignItems={{ sm: 'center' }} className="pp-forms-toolbar">
          <Stack direction="row" alignItems="center" gap={1} className={`pp-forms-bulk${selected.size ? ' is-active' : ''}`} sx={{ mr: { sm: 'auto' } }}>
            <Checkbox size="small" checked={allSelected} indeterminate={selected.size > 0 && !allSelected} disabled={shown.length === 0}
              onChange={() => setSelected(allSelected ? new Set() : new Set(shown.map((form) => form.id)))} inputProps={{ 'aria-label': 'Select all forms on this page' }} />
            {selected.size === 0 ? <Typography fontSize="var(--fs-14)" color="text.secondary">Select all</Typography> : (
              <>
                <Typography fontSize="var(--fs-14)" fontWeight={600} role="status">{selected.size} selected</Typography>
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setBulkDeleting(true)}>Delete</Button>
                <Button size="small" onClick={() => setSelected(new Set())}>Clear</Button>
              </>
            )}
          </Stack>
          <SearchField placeholder="Search forms" value={search} onChange={setSearch} onSearch={(value) => { setQuerySearch(value); reset(); }} sx={{ width: { xs: '100%', sm: 300 }, maxWidth: '100%' }} />
          <TextField select size="small" label="Sort by" value={sort} onChange={(event) => { setSort(event.target.value as FormsSort); reset(); }} sx={{ width: { xs: '100%', sm: 190 } }}>
            <MenuItem value="newest">Newest first</MenuItem><MenuItem value="oldest">Oldest first</MenuItem><MenuItem value="name">Name (A–Z)</MenuItem>
          </TextField>
        </Stack>

        {forms.isPending ? (
          <Stack gap={1} sx={{ p: 2 }}>{[0, 1, 2].map((row) => <Skeleton key={row} variant="rounded" height={150} />)}</Stack>
        ) : shown.length === 0 ? (
          <Box sx={{ py: 6 }}>
            <EmptyState {...listEmpty({
              icon: <DynamicFormOutlined />,
              noun: 'forms',
              error: forms.isError && 'Forms could not be loaded',
              onRetry: () => void forms.refetch(),
              search: querySearch,
              onClear: () => { setSearch(''); setQuerySearch(''); reset(); },
              description: 'Create a pop-up to start collecting subscribers.',
              create: { label: 'Create form', href: '/dashboard/forms/create' },
            })} />
          </Box>
        ) : (
          <Box component="ul" className="pp-forms-rows" aria-label="Forms">
            {shown.map((form) => <FormRow key={form.id} form={form} projectId={projectId!} notify={notify} selected={selected.has(form.id)} onSelect={() => toggle(form.id)} onChanged={() => void client.invalidateQueries({ queryKey: formsKeys.all })} />)}
          </Box>
        )}

        {total > PAGE_SIZE && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" className="pp-forms-footer">
            <Typography color="text.secondary" fontSize="var(--fs-13)">{page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}</Typography>
            <Stack direction="row" gap={1}>
              <Button size="small" variant="outlined" disabled={page === 0} onClick={() => { setPage(page - 1); setSelected(new Set()); }}>Previous</Button>
              <Button size="small" variant="outlined" disabled={page >= pages - 1} onClick={() => { setPage(page + 1); setSelected(new Set()); }}>Next</Button>
            </Stack>
          </Stack>
        )}
      </Paper>
      <DeleteConfirmDialog open={bulkDeleting} loading={removeSelected.isPending} onClose={() => setBulkDeleting(false)} onConfirm={() => removeSelected.mutate()}
        title={`Delete ${selected.size} form${selected.size === 1 ? '' : 's'}?`}
        description={shown.some((form) => selected.has(form.id) && form.status === 'active') ? 'Live forms stop showing on your site immediately. This cannot be undone.' : 'This cannot be undone.'} />
      {notice}
    </Box>
  );
}


function FormRow({ form, projectId, notify, onChanged, selected, onSelect }: { form: FormDraft; projectId: string; notify: (message: string) => void; onChanged: () => void; selected: boolean; onSelect: () => void }) {
  const [previewing, setPreviewing] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(form.name);
  const save = useSaveForm(projectId);
  const changeStatus = useMutation({ mutationFn: (status: FormStatus) => setFormStatus(form.id, status, projectId), onSuccess: () => onChanged(), onError: (error) => notify(error instanceof Error ? error.message : 'Could not update form status.') });
  const duplicate = useMutation({ mutationFn: () => duplicateForm(form.id, projectId), onSuccess: () => { onChanged(); notify('Form duplicated'); } });
  const remove = useMutation({ mutationFn: () => deleteForm(form.id, projectId), onSuccess: () => { setDeleting(false); onChanged(); notify('Form deleted'); } });
  const problems = publishProblems(form);
  const live = form.status === 'active';
  const editHref = `/dashboard/forms/${form.id}/edit?step=${form.groups.length === 0 ? 'audience' : 'editor'}`;

  return (
    <Box component="li" className={`pp-forms-row${selected ? ' is-selected' : ''}`}>
      <Box className="pp-forms-row-thumb">
        <FormThumbnail draft={form} width="100%" height={136} scale={0.34} />
        <button type="button" className="pp-forms-row-preview" onClick={() => setPreviewing(true)} aria-label={`Preview ${form.name}`}><VisibilityOutlined /><span>Preview</span></button>
        <Checkbox size="small" className="pp-forms-row-check" checked={selected} onChange={onSelect} inputProps={{ 'aria-label': `Select ${form.name}` }} />
      </Box>
      <Box className="pp-forms-row-main">
        <StatusChip status={form.status} />
        <Typography component={Link} href={`/dashboard/forms/${form.id}`} className="pp-forms-row-name" noWrap>{form.name}</Typography>
        <Typography className="pp-forms-row-date" color="text.secondary">
          {usageShort[form.behaviour.mode]} <span aria-hidden="true">·</span> Created {formatDate(form.createdAt)}
        </Typography>
        <Stack direction="row" gap={1} sx={{ mt: 1.5 }} alignItems="center" flexWrap="wrap">
          <Button size="small" variant="contained" disableElevation className="pp-forms-overview-button" component={Link} href={`/dashboard/forms/${form.id}`}>Overview</Button>
          <Button size="small" variant="outlined" component={Link} href={editHref}>{form.status === 'draft' ? 'Continue editing' : 'Edit'}</Button>
          <Tooltip title="More actions"><IconButton aria-label={`More actions for ${form.name}`} aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}><MoreVertRounded /></IconButton></Tooltip>
        </Stack>
      </Box>
      <Box className="pp-forms-row-stats">
        <Metric label="Subscribers" value={form.stats.subscribers.toLocaleString()} tone="accent" />
        <Metric label="Views" value={form.stats.views.toLocaleString()} tone="info" />
        <Metric label="Conversion" value={conversion(form)} tone="success" />
      </Box>
      <Tooltip title={!live && problems.length ? problems[0] : live ? 'Pause form' : 'Make form live'}>
        <span className="pp-forms-row-switch">
          <Switch checked={live} disabled={(!live && problems.length > 0) || changeStatus.isPending} inputProps={{ 'aria-label': `${form.name} is live` }}
            onChange={(event) => changeStatus.mutate(event.target.checked ? 'active' : 'paused', { onSuccess: () => notify(event.target.checked ? 'Form is live' : 'Form paused') })} />
        </span>
      </Tooltip>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem component={Link} href={editHref}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon><ListItemText>Edit</ListItemText></MenuItem>
        <MenuItem onClick={() => { setName(form.name); setRenaming(true); setAnchor(null); }}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon><ListItemText>Rename</ListItemText></MenuItem>
        <MenuItem onClick={() => { duplicate.mutate(); setAnchor(null); }}><ListItemIcon><ContentCopyRounded fontSize="small" /></ListItemIcon><ListItemText>Duplicate</ListItemText></MenuItem>
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
      <FormPreview draft={form} open={previewing} onClose={() => setPreviewing(false)} />
      <DeleteConfirmDialog open={deleting} loading={remove.isPending} onClose={() => setDeleting(false)} onConfirm={() => remove.mutate()} title={`Delete “${form.name}”?`} description={live ? 'The form is live: it stops showing on your site immediately. This cannot be undone.' : 'This cannot be undone.'} />
    </Box>
  );
}

const usageShort = { click: 'Opens on click', auto: 'Pops up on its own', inline: 'Embedded' } as const;

function Metric({ label, value, tone }: { label: string; value: string; tone: 'accent' | 'info' | 'success' }) {
  return <Box className={`pp-forms-metric is-${tone}`}><Typography className="pp-forms-metric-label">{label}</Typography><Typography className="pp-forms-metric-value">{value}</Typography></Box>;
}
