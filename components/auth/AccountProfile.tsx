'use client';

import { CheckCircleRounded, EmailRounded, PersonRounded, ScheduleRounded, VpnKeyRounded } from '@mui/icons-material';
import { Alert, Box, Card, CardContent, Chip, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useCurrentUser } from '@/hooks/auth/use-current-user';

const display = (value: string | null | undefined) => value?.trim() || '-';

export default function AccountProfile() {
  const { account, isLoading, isError } = useCurrentUser();
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
    </CardContent>
  </Card>;
}

function ProfileItem({ icon, label, value, end }: { icon: React.ReactNode; label: string; value?: string; end?: React.ReactNode }) {
  return <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, minHeight: 76 }}><Stack direction="row" alignItems="center" gap={1.2}><Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box><Box sx={{ flex: 1, minWidth: 0 }}><Typography color="text.secondary" fontSize={11}>{label}</Typography>{value === undefined ? <Skeleton width="70%" /> : <Typography fontSize={14} fontWeight={800} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography>}</Box>{end}</Stack></Box>;
}
