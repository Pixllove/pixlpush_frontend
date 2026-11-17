'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ContentCopyRounded, DeleteOutlineRounded, EditOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';
import EmptyState from '@/components/dashboard/EmptyState';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { deleteForm, duplicateForm, formsKeys, getForm, getFormAnalytics, listGroups, setFormStatus } from '@/lib/forms';
import { FormPreview } from './FormEditor';
import { conversion, formatDate } from './FormsList';
import { kindLabel, templates, urlLines, type FormDraft } from './model';
import { FormThumbnail, InstallPanel, StatusChip, StatusControl, useNotice } from './shared';

const usageLabel = { click: 'Opens when someone clicks a button', auto: 'Pops up on its own', inline: 'Embedded in a spot on the page' } as const;

export function behaviourSummary(draft: FormDraft): Array<[string, string]> {
  const b = draft.behaviour;
  if (b.mode !== 'auto') return [['How it is used', usageLabel[b.mode]]];
  const triggers = [b.delayOn && `after ${b.delay}s`, b.scrollOn && `at ${b.scroll}% scroll`, b.exitOn && 'when leaving'].filter(Boolean).join(', ');
  const devices = [b.hideDesktop && 'desktop', b.hideTablet && 'tablet', b.hideMobile && 'mobile'].filter(Boolean);
  const pages = b.pages === 'all' ? 'Every page' : `${b.pages === 'hide' ? 'All pages except' : 'Only'} ${urlLines(b.urls).length} page${urlLines(b.urls).length === 1 ? '' : 's'}${b.strict ? ' (exact match)' : ''}`;
  return [
    ['How it is used', usageLabel.auto],
    ['Shows', triggers || 'Never (no trigger)'],
    ['Shows again', b.repeat === 'always' ? 'On every visit until they sign up' : `${b.frequency} ${b.frequencyUnit} after it was closed`],
    ['Schedule', b.schedule === 'now' ? 'As soon as it is live' : `${b.startAt.replace('T', ' ')} to ${b.endAt.replace('T', ' ')}`],
    ['Pages', pages],
    ['Devices', devices.length ? `Hidden on ${devices.join(', ')}` : 'All devices'],
  ];
}

export default function FormOverview({ id }: { id: string }) {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const router = useRouter();
  const client = useQueryClient();
  const form = useQuery({ queryKey: formsKeys.one(projectId ?? '', id), queryFn: () => getForm(id, projectId!), enabled: Boolean(projectId) });
  const analytics = useQuery({ queryKey: formsKeys.analytics(projectId ?? '', id, {}), queryFn: () => getFormAnalytics(id, projectId!), enabled: Boolean(projectId) });
  const groups = useQuery({ queryKey: formsKeys.groupsFor(projectId ?? ''), queryFn: () => listGroups(projectId!), enabled: Boolean(projectId) });
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [notice, notify] = useNotice();
  const statusChange = useMutation({ mutationFn: (status: FormDraft['status']) => setFormStatus(id, status, projectId!), onSuccess: (saved) => { client.setQueryData(formsKeys.one(projectId!, id), saved); void client.invalidateQueries({ queryKey: formsKeys.all }); notify(saved.status === 'active' ? 'Form is live' : 'Form paused'); } });
  const duplicate = useMutation({ mutationFn: () => duplicateForm(id, projectId!), onSuccess: (copy) => { void client.invalidateQueries({ queryKey: formsKeys.all }); router.push(`/dashboard/forms/${copy.id}`); } });
  const remove = useMutation({ mutationFn: () => deleteForm(id, projectId!), onSuccess: () => { void client.invalidateQueries({ queryKey: formsKeys.all }); router.push('/dashboard/forms'); } });

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
          <Button variant="contained" startIcon={<EditOutlined />} component={Link} href={`/dashboard/forms/${id}/edit?step=${draft.groups.length === 0 ? 'audience' : 'editor'}`}>Edit form</Button>
        </Stack>
      </Stack>

      <Box className="pp-form-overview-stats">
        {[['Views', (analytics.data?.allTime.views ?? draft.stats.views).toLocaleString()], ['Subscribers', (analytics.data?.allTime.subscribers ?? draft.stats.subscribers).toLocaleString()], ['Conversion rate', analytics.data ? `${analytics.data.allTime.conversionRate.toFixed(1)}%` : conversion(draft)]].map(([label, value]) => (
          <Paper key={label} className="pp-form-stat"><Typography className="pp-forms-metric-label">{label}</Typography><Typography className="pp-form-stat-value">{value}</Typography></Paper>
        ))}
      </Box>

      <Box className="pp-form-overview">
        <Stack gap={2}>
          <Paper className="pp-form-step-card">
            <Typography variant="h3" sx={{ mb: 1.5 }}>Status</Typography>
            <StatusControl draft={draft} onChange={(status) => statusChange.mutate(status)} busy={statusChange.isPending} error={statusChange.error instanceof Error ? statusChange.error.message : undefined} />
          </Paper>
          <Paper className="pp-form-step-card">
            <Typography variant="h3" sx={{ mb: 1.5 }}>Install</Typography>
            <InstallPanel draft={draft} />
          </Paper>
          <Paper className="pp-form-step-card">
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Typography variant="h3">How it is used</Typography><Button size="small" component={Link} href={`/dashboard/forms/${id}/edit?step=setup`}>Change</Button></Stack>
            <dl className="pp-form-dl">{behaviourSummary(draft).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
          </Paper>
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
