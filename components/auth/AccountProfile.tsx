'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, Chip, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { billingApi } from '@/lib/projects/api';
import ChangePasswordForm from './ChangePasswordForm';
import TwoFactorSettings from './TwoFactorSettings';
import NotificationPreferences from './NotificationPreferences';
import UserAvatar from './UserAvatar';

const display = (value: string | null | undefined) => value?.trim() || '-';
// A fixed locale and time zone: the server and the browser must print the same text.
const memberSince = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
// While a value loads, the real field is drawn with a shimmer line where the value will appear, so the
// section looks the same before and after and nothing moves. It is read-only, not disabled, for that moment.
const loadingField = { InputLabelProps: { shrink: true }, InputProps: { readOnly: true, startAdornment: <Skeleton width={96} /> } };
const roleLabel = (role: string) => role === '-' ? role : role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

export default function AccountProfile({ section = 'all', showCompanyHeading = true, embedded = false }: { section?: 'all' | 'profile' | 'company'; showCompanyHeading?: boolean; embedded?: boolean } = {}) {
  const { account, isLoading, isError } = useCurrentUser();
  const { active, isEmpty, isPending: projectsPending } = useActiveProject();
  const queryClient = useQueryClient();
  const billingQuery = useQuery({ queryKey: ['projects', 'billing', active?.id, 'subscription'], queryFn: () => billingApi.subscription(active!.id), enabled: Boolean(active?.id) });
  const [company, setCompany] = useState('');
  useEffect(() => setCompany(billingQuery.data?.billingContact?.company ?? ''), [billingQuery.data?.billingContact?.company]);
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
  // The active Project is picked in an effect, so until it is known the fields are still loading: showing
  // them empty and locked would tell an owner they lack permission.
  const projectPending = projectsPending || (!active && !isEmpty);
  const companyLoading = projectPending || billingQuery.isLoading;
  const roleLoading = projectPending;
  const canEditCompany = ['owner', 'admin', 'billing'].includes(active?.role ?? '');
  if (isError) return <Alert severity="error">Could not load your profile. Please refresh and try again.</Alert>;
  const companyContent = (section === 'all' || section === 'company') && <section className={`pp-profile-section${embedded ? ' is-embedded' : ''}`}>
    {showCompanyHeading && <div>
      <Typography variant="h3">Company & workspace</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Company information used for billing and workspace identification.</Typography>
    </div>}
    <Stack gap={3}>
      <TextField label="Company name" value={companyLoading ? '' : company} onChange={event => setCompany(event.target.value)} {...(companyLoading ? loadingField : {})} disabled={!companyLoading && (!active || saveCompany.isPending || !canEditCompany)} helperText={!companyLoading && !canEditCompany ? 'Only owners, admins, and billing managers can update this.' : undefined} />
      {saveCompany.isSuccess && <Alert severity="success">Company name saved.</Alert>}
      {saveCompany.isError && <Alert severity="error">Could not save company name.</Alert>}
      <Button type="button" variant="contained" onClick={() => !companyLoading && saveCompany.mutate()} disabled={!companyLoading && (saveCompany.isPending || !canEditCompany)} sx={{ alignSelf: 'flex-start' }}>{saveCompany.isPending ? 'Saving…' : 'Save company name'}</Button>
    </Stack>
  </section>;

  if (embedded) return <Stack gap={3}>{companyContent}</Stack>;

  return <Stack gap={3} sx={{ maxWidth: 960 }}>
    {section !== 'company' && <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={3}>
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
    </Stack>}

    <Card>
      {(section === 'all' || section === 'profile') && <section className="pp-profile-section">
        <div>
          <Typography variant="h3">Project role</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Your access level for this PixlPush project.</Typography>
        </div>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" className="pp-profile-label">Current role</Typography>
          <Typography noWrap>{roleLoading ? <Skeleton width="70%" /> : roleLabel(active?.role ?? '-')}</Typography>
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .5 }}>Managed in Team & Access.</Typography>
        </Box>
      </section>}

      {!embedded && companyContent}

      {(section === 'all' || section === 'profile') && <NotificationPreferences />}
      {(section === 'all' || section === 'profile') && <TwoFactorSettings />}
      {(section === 'all' || section === 'profile') && <ChangePasswordForm />}
    </Card>
  </Stack>;
}
