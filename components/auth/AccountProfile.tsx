'use client';

import { useEffect, useState } from 'react';
import { CheckCircleRounded, EmailRounded, PersonRounded, ScheduleRounded, VpnKeyRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Grid, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { billingApi, teamApi } from '@/lib/projects/api';
import type { ProjectRole } from '@/types/project';

const display = (value: string | null | undefined) => value?.trim() || '-';

export default function AccountProfile() {
  const { account, isLoading, isError } = useCurrentUser();
  const { active, isPending: projectsPending } = useActiveProject();
  const queryClient = useQueryClient();
  const billingQuery = useQuery({ queryKey: ['projects', 'billing', active?.id, 'subscription'], queryFn: () => billingApi.subscription(active!.id), enabled: Boolean(active?.id) });
  const membersQuery = useQuery({ queryKey: ['projects', 'members', active?.id], queryFn: () => teamApi.members(active!.id), enabled: Boolean(active?.id) });
  const [company, setCompany] = useState('');
  const [role, setRole] = useState(active?.role ?? '');
  useEffect(() => setCompany(billingQuery.data?.billingContact?.company ?? ''), [billingQuery.data?.billingContact?.company]);
  useEffect(() => setRole(active?.role ?? ''), [active?.role]);
  const saveCompany = useMutation({
    mutationFn: () => billingApi.updateContact(active!.id, {
      email: billingQuery.data?.billingContact?.email ?? account?.email ?? '',
      name: billingQuery.data?.billingContact?.name ?? account?.name ?? undefined,
      company: company.trim() || undefined,
      addressLine1: billingQuery.data?.billingContact?.addressLine1 ?? undefined,
      addressLine2: billingQuery.data?.billingContact?.addressLine2 ?? undefined,
      postalCode: billingQuery.data?.billingContact?.postalCode ?? undefined,
      city: billingQuery.data?.billingContact?.city ?? undefined,
      country: billingQuery.data?.billingContact?.country ?? undefined,
      vatId: billingQuery.data?.billingContact?.vatId ?? undefined,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'billing', active?.id, 'subscription'] }),
  });
  const saveRole = useMutation({
    mutationFn: (nextRole: ProjectRole) => {
      const member = membersQuery.data?.find(item => item.account.id === account?.id);
      if (!member) throw new Error('Current project member was not found.');
      return teamApi.updateRole(active!.id, member.id, nextRole);
    },
    onSuccess: (_result, nextRole) => {
      setRole(nextRole);
      queryClient.invalidateQueries({ queryKey: ['auth', 'current-user'] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'members', active?.id] });
    },
  });
  const canManageRoles = ['owner', 'admin'].includes(active?.role ?? '');
  // Loading is shown as a placeholder of the field's size, never as a greyed-out field that ignores typing.
  const companyLoading = projectsPending || billingQuery.isLoading;
  const roleLoading = projectsPending || membersQuery.isLoading;
  if (isError) return <Alert severity="error">Could not load your profile. Please refresh and try again.</Alert>;
  return <Card className="saas-card" sx={{ maxWidth: 900, mb: 2.5 }}>
    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
      <Typography variant="h3">Profile details</Typography>
      <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>Your PixlPush account information.</Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}><ProfileItem icon={<PersonRounded />} label="Full name" value={isLoading ? undefined : display(account?.name)} /></Grid>
        <Grid item xs={12} md={6}><ProfileItem icon={<EmailRounded />} label="Email address" value={isLoading ? undefined : display(account?.email)} end={account ? <Chip size="small" color={account.emailVerified ? 'primary' : 'default'} icon={account.emailVerified ? <CheckCircleRounded /> : undefined} label={account.emailVerified ? 'Verified' : 'Not verified'} /> : undefined} /></Grid>
        <Grid item xs={12} md={6}><ProfileItem icon={<VpnKeyRounded />} label="Account ID" value={isLoading ? undefined : display(account?.id)} /></Grid>
        <Grid item xs={12} md={6}><ProfileItem icon={<ScheduleRounded />} label="Account created" value={isLoading ? undefined : account?.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(account.createdAt)) : '-'} /></Grid>
      </Grid>
      <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography fontWeight={600}>Company & workspace</Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>Your current organization context in PixlPush.</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}><Stack gap={.7}><Typography color="text.secondary" fontSize={11}>Company name</Typography>{companyLoading ? <Skeleton variant="rounded" height={40} /> : <TextField size="small" value={company} onChange={event => setCompany(event.target.value)} placeholder="Enter your company name" disabled={!active || saveCompany.isPending || !['owner', 'admin', 'billing'].includes(active.role)} helperText={!['owner', 'admin', 'billing'].includes(active?.role ?? '') ? 'Only owners, admins, and billing managers can update this.' : 'Used for billing and workspace identification.'} />}</Stack></Grid>
          <Grid item xs={12} md={6}><Stack gap={.7}><Typography color="text.secondary" fontSize={11}>Workspace role</Typography>{roleLoading ? <Skeleton variant="rounded" height={40} /> : <Select size="small" value={role} displayEmpty onChange={event => saveRole.mutate(event.target.value as ProjectRole)} disabled={!canManageRoles || saveRole.isPending}>{['owner', 'admin', 'developer', 'analyst', 'read_only', 'billing'].map(item => <MenuItem key={item} value={item}>{item.replace('_', ' ')}</MenuItem>)}</Select>}<Typography color="text.secondary" fontSize={11}>{canManageRoles ? 'Changes are managed through Team & Access permissions.' : 'Only owners and admins can change workspace roles.'}</Typography>{saveRole.isError && <Typography color="error" fontSize={11}>Could not update workspace role.</Typography>}</Stack></Grid>
          <Grid item xs={12}><Stack direction="row" alignItems="center" gap={1.5}><Button variant="contained" size="small" onClick={() => saveCompany.mutate()} disabled={billingQuery.isLoading || saveCompany.isPending || !['owner', 'admin', 'billing'].includes(active?.role ?? '')}>{saveCompany.isPending ? 'Saving…' : 'Save company name'}</Button>{saveCompany.isSuccess && <Typography color="success.main" fontSize={11}>Company name saved.</Typography>}{saveCompany.isError && <Typography color="error" fontSize={11}>Could not save company name.</Typography>}</Stack></Grid>
        </Grid>
      </Box>
    </CardContent>
  </Card>;
}

function ProfileItem({ icon, label, value, end }: { icon: React.ReactNode; label: string; value?: string; end?: React.ReactNode }) {
  return <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, minHeight: 76 }}><Stack direction="row" alignItems="center" gap={1.2}><Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box><Box sx={{ flex: 1, minWidth: 0 }}><Typography color="text.secondary" fontSize={11}>{label}</Typography>{value === undefined ? <Skeleton width="70%" /> : <Typography fontSize={14} fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography>}</Box>{end}</Stack></Box>;
}
