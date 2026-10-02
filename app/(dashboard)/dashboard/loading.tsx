'use client';

import { usePathname } from 'next/navigation';
import { Box, Skeleton, Stack } from '@mui/material';
import DashboardFrame from '@/components/dashboard/DashboardFrame';

const sections: Record<string, string> = {
  users: 'Users', email: 'Email', push: 'Push Notifications', journeys: 'Journey Automations', integrations: 'Integrations',
  team: 'Team & Access', 'audit-logs': 'Audit Logs', billing: 'Billing & Usage', settings: 'Settings',
};

/**
 * Shown the moment a sidebar link is clicked, while the page itself is fetched. Without it the old page
 * stays frozen until the next one arrives, which reads as a click that did nothing. It also lets Next
 * fetch this shell ahead of the click, so the switch is immediate.
 */
export default function DashboardLoading() {
  const section = usePathname().split('/')[2] ?? '';
  return (
    <DashboardFrame active={sections[section] ?? 'Overview'} title="" description="" hideHeader>
      <Stack gap={2.5} aria-busy="true" aria-label="Loading page">
        <Box>
          <Skeleton variant="rounded" width={220} height={34} />
          <Skeleton variant="rounded" width="min(520px, 80%)" height={18} sx={{ mt: 1.25 }} />
        </Box>
        <Skeleton variant="rounded" height={64} sx={{ borderRadius: '18px' }} />
        <Skeleton variant="rounded" height={360} sx={{ borderRadius: '18px' }} />
      </Stack>
    </DashboardFrame>
  );
}
