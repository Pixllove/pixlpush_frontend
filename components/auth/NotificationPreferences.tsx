'use client';

import { Alert, Box, Divider, Skeleton, Stack, Switch, Typography } from '@mui/material';
import { useNotificationPreferences, useUpdateNotificationPreference } from '@/hooks/notifications/use-notifications';
import type { NotificationCategory } from '@/types/notifications';

const rows: Array<{ category: NotificationCategory; title: string; description: string }> = [
  { category: 'account', title: 'Account activity', description: 'Welcome messages, profile changes and account lifecycle updates.' },
  { category: 'security', title: 'Security alerts', description: 'Sign-in, verification and access changes that need your attention.' },
  { category: 'project', title: 'Project activity', description: 'Project creation, status changes and important workspace health updates.' },
  { category: 'onboarding', title: 'Onboarding guidance', description: 'Helpful setup milestones and suggestions for your workspace.' },
  { category: 'team', title: 'Team & access', description: 'Invitations, role changes and membership updates across your Projects.' },
  { category: 'billing', title: 'Billing & usage', description: 'Plan, payment, usage and subscription updates.' },
  { category: 'messaging', title: 'Messaging activity', description: 'Campaign, journey and delivery updates from your Projects.' },
  { category: 'integration', title: 'Integrations', description: 'SDK, Firebase and connected-service status changes.' },
  { category: 'announcement', title: 'PixlPush announcements', description: 'Product updates and important notices from the PixlPush team.' },
];

export default function NotificationPreferences() {
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreference();
  const stored = new Map(preferences.data?.map((preference) => [preference.category, preference]));

  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box>
        <Typography variant="h3">Notification preferences</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
          Choose how PixlPush keeps you informed. In-app updates always appear in your notification inbox unless dismissed.
        </Typography>
      </Box>
      {preferences.isError && <Alert severity="error" sx={{ mt: 2 }}>Could not load notification preferences.</Alert>}
      <Stack divider={<Divider flexItem />} sx={{ mt: 2 }}>
        {preferences.isPending ? [1, 2, 3].map((item) => <Stack key={item} direction="row" justifyContent="space-between" sx={{ py: 2 }}><Box sx={{ flex: 1 }}><Skeleton width="34%" /><Skeleton width="70%" /></Box><Skeleton width={130} /></Stack>) : rows.map((row) => {
          const preference = stored.get(row.category);
          const protectedCategory = row.category === 'security';
          return (
            <Stack key={row.category} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5} sx={{ py: 2 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={600} fontSize="var(--fs-13)">{row.title}</Typography>
                <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .35 }}>{row.description}</Typography>
                {protectedCategory && <Typography color="text.secondary" fontSize="var(--fs-11)" sx={{ mt: .45 }}>Security alerts are always delivered for your protection.</Typography>}
              </Box>
              <Stack direction="row" gap={{ xs: 2, sm: 1.5 }} sx={{ flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" gap={.4}>
                  <Switch
                    size="small"
                    checked={preference?.inAppEnabled ?? true}
                    disabled={protectedCategory || update.isPending}
                    onChange={(event) => update.mutate({ category: row.category, inAppEnabled: event.target.checked })}
                    inputProps={{ 'aria-label': `${row.title} in-app notifications` }}
                  />
                  <Typography fontSize="var(--fs-12)" color="text.secondary">In-app</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={.4}>
                  <Switch
                    size="small"
                    checked={preference?.emailEnabled ?? true}
                    disabled={protectedCategory || update.isPending}
                    onChange={(event) => update.mutate({ category: row.category, emailEnabled: event.target.checked })}
                    inputProps={{ 'aria-label': `${row.title} email notifications` }}
                  />
                  <Typography fontSize="var(--fs-12)" color="text.secondary">Email</Typography>
                </Stack>
              </Stack>
            </Stack>
          );
        })}
      </Stack>
      {update.isError && <Alert severity="error" sx={{ mt: 1 }}>Could not save that notification preference. Please try again.</Alert>}
      {update.isSuccess && <Typography color="success.main" fontSize="var(--fs-12)" sx={{ mt: 1 }}>Notification preference saved.</Typography>}
    </Box>
  );
}
