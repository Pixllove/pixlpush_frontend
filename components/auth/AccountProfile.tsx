'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, Chip, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { billingApi, teamApi } from '@/lib/projects/api';
import type { ProjectRole } from '@/types/project';
import ChangePasswordForm from './ChangePasswordForm';
import UserAvatar from './UserAvatar';

const display = (value: string | null | undefined) => value?.trim() || '-';
// A fixed locale and time zone: the server and the browser must print the same text.
const memberSince = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
// While a value loads, the real field is drawn with a shimmer line where the value will appear, so the
// section looks the same before and after and nothing moves. It is read-only, not disabled, for that moment.
const loadingField = { InputLabelProps: { shrink: true }, InputProps: { readOnly: true, startAdornment: <Skeleton width={96} /> } };
const roleLabel = (role: string) => role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

export default function AccountProfile() {
  const { account, isLoading, isError } = useCurrentUser();
  const { active, isEmpty, isPending: projectsPending } = useActiveProject();
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
  // The active Project is picked in an effect, so until it is known the fields are still loading: showing
  // them empty and locked would tell an owner they lack permission.
  const projectPending = projectsPending || (!active && !isEmpty);
  const companyLoading = projectPending || billingQuery.isLoading;
  const roleLoading = projectPending || membersQuery.isLoading;
  const canEditCompany = ['owner', 'admin', 'billing'].includes(active?.role ?? '');
  if (isError) return <Alert severity="error">Could not load your profile. Please refresh and try again.</Alert>;
  return <Stack gap={3} sx={{ maxWidth: 960 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={3}>
      <Stack direction="row" alignItems="center" gap={2} sx={{ minWidth: 0 }}>
        {isLoading ? <Skeleton variant="circular" width={56} height={56} /> : <UserAvatar account={account} size={56} />}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2" noWrap>{isLoading ? <Skeleton width={180} /> : display(account?.name)}</Typography>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography color="text.secondary" noWrap>{isLoading ? <Skeleton width={220} /> : display(account?.email)}</Typography>
            {account && <Chip size="small" color={account.emailVerified ? 'success' : 'default'} label={account.emailVerified ? 'Verified' : 'Not verified'} />}
          </Stack>
        </Box>
      </Stack>
      <Box>
        <Typography variant="caption" className="pp-profile-label">Member since</Typography>
        <Typography className="pp-profile-date">{isLoading ? <Skeleton width={90} /> : account?.createdAt ? memberSince.format(new Date(account.createdAt)) : '-'}</Typography>
      </Box>
    </Stack>

    <Card>
      <section className="pp-profile-section">
        <div>
          <Typography variant="h3">Profile</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Your PixlPush account information.</Typography>
        </div>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" className="pp-profile-label">Full name</Typography>
            <Typography noWrap>{isLoading ? <Skeleton width="70%" /> : display(account?.name)}</Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" className="pp-profile-label">Email address</Typography>
            <Typography noWrap>{isLoading ? <Skeleton width="70%" /> : display(account?.email)}</Typography>
          </Box>
        </Box>
      </section>

      <section className="pp-profile-section">
        <div>
          <Typography variant="h3">Company & workspace</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Your current organization context in PixlPush.</Typography>
        </div>
        <Stack gap={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
            <TextField label="Company name" value={companyLoading ? '' : company} onChange={event => setCompany(event.target.value)} {...(companyLoading ? loadingField : {})} disabled={!companyLoading && (!active || saveCompany.isPending || !canEditCompany)} helperText={companyLoading || canEditCompany ? 'Used for billing and workspace identification.' : 'Only owners, admins, and billing managers can update this.'} />
            <TextField select label="Workspace role" value={roleLoading ? '' : role} onChange={event => saveRole.mutate(event.target.value as ProjectRole)} {...(roleLoading ? loadingField : {})} disabled={!roleLoading && (!canManageRoles || saveRole.isPending)} error={saveRole.isError} helperText={saveRole.isError ? 'Could not update workspace role.' : roleLoading || canManageRoles ? 'Changes are managed through Team & Access permissions.' : 'Only owners and admins can change workspace roles.'}>
              {['owner', 'admin', 'developer', 'analyst', 'read_only', 'billing'].map(item => <MenuItem key={item} value={item}>{roleLabel(item)}</MenuItem>)}
            </TextField>
          </Box>
          {saveCompany.isSuccess && <Alert severity="success">Company name saved.</Alert>}
          {saveCompany.isError && <Alert severity="error">Could not save company name.</Alert>}
          <Button variant="contained" onClick={() => !companyLoading && saveCompany.mutate()} disabled={!companyLoading && (saveCompany.isPending || !canEditCompany)} sx={{ alignSelf: 'flex-start' }}>{saveCompany.isPending ? 'Saving…' : 'Save company name'}</Button>
        </Stack>
      </section>

      <ChangePasswordForm />
    </Card>
  </Stack>;
}
