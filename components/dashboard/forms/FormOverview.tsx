'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ContentCopyRounded, DeleteOutlineRounded, EditOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';
import EmptyState from '@/components/dashboard/EmptyState';
import { deleteForm, duplicateForm, formsKeys, getForm, listGroups } from '@/lib/forms';
import { FormPreview } from './FormEditor';
import { conversion, formatDate } from './FormsList';
import { kindLabel, templates, urlLines, type FormDraft } from './model';
import { FormThumbnail, InstallPanel, StatusChip, StatusControl, useNotice, useSaveForm } from './shared';

export function behaviourSummary(draft: FormDraft): Array<[string, string]> {
  const b = draft.behaviour;
  const triggers = [b.delayOn && `after ${b.delay}s`, b.scrollOn && `at ${b.scroll}% scroll`, b.exitOn && 'on exit intent', b.clickOn && 'on click'].filter(Boolean).join(', ');
  const devices = [b.hideDesktop && 'desktop', b.hideTablet && 'tablet', b.hideMobile && 'mobile'].filter(Boolean);
  const pages = b.pages === 'all' ? 'Every page' : `${b.pages === 'hide' ? 'All pages except' : 'Only'} ${urlLines(b.urls).length} page${urlLines(b.urls).length === 1 ? '' : 's'}${b.strict ? ' (exact match)' : ''}`;
  return [
    ['Shows', triggers || 'Never (no trigger)'],
    ['Repeats', `Every ${b.frequency} ${b.frequencyUnit} for people who did not subscribe`],
    ['Schedule', b.schedule === 'now' ? 'As soon as it is live' : `${b.startAt.replace('T', ' ')} to ${b.endAt.replace('T', ' ')}`],
    ['Pages', pages],
    ['Devices', devices.length ? `Hidden on ${devices.join(', ')}` : 'All devices'],
  ];
}

export default function FormOverview({ id }: { id: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const form = useQuery({ queryKey: formsKeys.one(id), queryFn: () => getForm(id) });
  const groups = useQuery({ queryKey: formsKeys.groups, queryFn: listGroups });
  const save = useSaveForm();
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [notice, notify] = useNotice();
  const duplicate = useMutation({ mutationFn: () => duplicateForm(id), onSuccess: (copy) => { void client.invalidateQueries({ queryKey: formsKeys.all }); router.push(`/dashboard/forms/${copy.id}`); } });
  const remove = useMutation({ mutationFn: () => deleteForm(id), onSuccess: () => { void client.invalidateQueries({ queryKey: formsKeys.all }); router.push('/dashboard/forms'); } });

  if (form.isError) return <EmptyState tone="error" title="This form could not be opened" description={(form.error as Error).message} action={{ label: 'Back to forms', href: '/dashboard/forms' }} />;
  if (!form.data) return <Box className="pp-form-wizard"><Skeleton height={48} width={280} /><Skeleton variant="rounded" height={320} sx={{ mt: 2 }} /></Box>;
  const draft = form.data;
  const groupNames = draft.groups.map((groupId) => groups.data?.find((group) => group.id === groupId)?.name).filter(Boolean).join(', ') || 'None';
  const details: Array<[string, string]> = [
    ['Type', kindLabel[draft.kind]],
    ['Groups', groupNames],
    ['Template', templates.find((template) => template.id === draft.template)?.name ?? 'Custom'],
    ['Created', formatDate(draft.createdAt)],
    ['Last updated', formatDate(draft.updatedAt)],
  ];

  return (
    <Box className="pp-form-wizard">
      <Stack direction="row" alignItems="center" gap={0.75} className="pp-form-crumbs"><Link href="/dashboard/forms">Forms</Link><span aria-hidden>/</span><Typography component="span" noWrap>{draft.name}</Typography></Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2} sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}><Typography variant="h1" className="dashboard-title" noWrap>{draft.name}</Typography><StatusChip status={draft.status} /></Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => setPreview(true)}>Preview</Button>
          <Button variant="outlined" startIcon={<ContentCopyRounded />} disabled={duplicate.isPending} onClick={() => duplicate.mutate()}>Duplicate</Button>
          <Button variant="outlined" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setDeleting(true)}>Delete</Button>
          <Button variant="contained" startIcon={<EditOutlined />} component={Link} href={`/dashboard/forms/${id}/edit?step=editor`}>Edit form</Button>
        </Stack>
      </Stack>

      <Box className="pp-form-overview-stats">
        {[['Views', draft.stats.views.toLocaleString()], ['Subscribers', draft.stats.subscribers.toLocaleString()], ['Conversion rate', conversion(draft)]].map(([label, value]) => (
          <Paper key={label} className="pp-form-stat"><Typography className="pp-forms-metric-label">{label}</Typography><Typography className="pp-form-stat-value">{value}</Typography></Paper>
        ))}
      </Box>

      <Box className="pp-form-overview">
        <Stack gap={2}>
          <Paper className="pp-form-step-card">
            <Typography variant="h3" sx={{ mb: 1.5 }}>Status</Typography>
            <StatusControl draft={draft} onChange={(status) => save.mutate({ ...draft, status }, { onSuccess: () => notify(status === 'active' ? 'Form is live' : 'Form paused') })} />
          </Paper>
          <Paper className="pp-form-step-card">
            <Typography variant="h3" sx={{ mb: 1.5 }}>Install</Typography>
            <InstallPanel draft={draft} />
          </Paper>
          {draft.kind !== 'embedded' && (
            <Paper className="pp-form-step-card">
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Typography variant="h3">Behaviour</Typography><Button size="small" component={Link} href={`/dashboard/forms/${id}/edit?step=behaviour`}>Edit behaviour</Button></Stack>
              <dl className="pp-form-dl">{behaviourSummary(draft).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
            </Paper>
          )}
        </Stack>
        <Stack gap={2}>
          <Paper className="pp-form-step-card">
            <Typography variant="h3" sx={{ mb: 1.5 }}>Preview</Typography>
            <div className="pp-form-template"><FormThumbnail draft={draft} width="100%" height={220} scale={0.5} /><button type="button" className="pp-form-template-hit" onClick={() => setPreview(true)} aria-label="Open preview" /></div>
          </Paper>
          <Paper className="pp-form-step-card">
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Typography variant="h3">Details</Typography><Button size="small" component={Link} href={`/dashboard/forms/${id}/edit?step=details`}>Edit</Button></Stack>
            <dl className="pp-form-dl">{details.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
          </Paper>
        </Stack>
      </Box>

      <FormPreview draft={draft} open={preview} onClose={() => setPreview(false)} />
      <DeleteConfirmDialog open={deleting} loading={remove.isPending} onClose={() => setDeleting(false)} onConfirm={() => remove.mutate()} title={`Delete “${draft.name}”?`} description="The form stops showing on your site and its settings are removed. This cannot be undone." />
      {notice}
    </Box>
  );
}
