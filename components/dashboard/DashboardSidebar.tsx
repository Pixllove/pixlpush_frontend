'use client';

import { HistoryRounded, BarChartRounded, BoltRounded, CampaignRounded, DashboardRounded, GroupsRounded, InsightsRounded, SettingsOutlined, TuneRounded } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useActiveProject, planLabel } from '@/hooks/projects/use-active-project';

const navigation = [
  { label: 'Overview', href: '/dashboard', icon: DashboardRounded }, { label: 'Users', href: '/dashboard/users', icon: GroupsRounded },
  { label: 'Email', href: '/dashboard/email', icon: CampaignRounded }, { label: 'Push Notifications', href: '/dashboard/push', icon: BoltRounded },
  { label: 'Journey Automations', href: '/dashboard/journeys', icon: InsightsRounded },
  { label: 'Integrations', href: '/dashboard/integrations', icon: TuneRounded }, { label: 'Team & Access', href: '/dashboard/team', icon: GroupsRounded }, { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: HistoryRounded },
  { label: 'Billing & Usage', href: '/dashboard/billing', icon: BarChartRounded }, { label: 'Settings', href: '/dashboard/settings', icon: SettingsOutlined },
];

function Brand() { return <Box component="img" src="/assets/logo.png" alt="PixlPush" sx={{ display: 'block', width: 165, height: 'auto' }} />; }

export default function DashboardSidebar({ active, setActive, mobileOpen }: { active: string; setActive: (value: string) => void; mobileOpen: boolean }) {
  const { active: activeProject, isPending } = useActiveProject();
  return <Box className={`dashboard-sidebar ${mobileOpen ? 'is-open' : ''}`}><Stack sx={{ height: '100%', p: 2 }}><Box sx={{ px: 1, py: 1.2, mb: 2 }}><Brand /></Box><Typography className="sidebar-kicker">WORKSPACE</Typography><Stack gap={.5}>{navigation.slice(0, 5).map(({ label, href, icon: Icon }) => <Button key={label} href={href} onClick={() => setActive(label)} className={active === label ? 'dashboard-nav active' : 'dashboard-nav'} startIcon={<Icon />} sx={{ justifyContent: 'flex-start' }}>{label}</Button>)}</Stack><Typography className="sidebar-kicker" sx={{ mt: 2 }}>PROJECT</Typography><Stack gap={.5}>{navigation.slice(5).map(({ label, href, icon: Icon }) => <Button key={label} href={href} onClick={() => setActive(label)} className={active === label ? 'dashboard-nav active' : 'dashboard-nav'} startIcon={<Icon />} sx={{ justifyContent: 'flex-start' }}>{label}</Button>)}</Stack><Box className="sidebar-promo" sx={{ mt: 'auto' }}><Box className="promo-gradient" /><Typography fontWeight={900} fontSize={15}>{activeProject?.name ?? (isPending ? 'Loading…' : 'No project')}<br /><span style={{ opacity: .66, fontSize: 12 }}>{activeProject ? planLabel(activeProject) : 'Create one to get started'}</span></Typography><Box className="promo-progress" /></Box></Stack></Box>;
}
