'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Button, Card, Stack, Tab, Tabs, Typography } from '@mui/material';

import DangerZonePanel from './DangerZonePanel';
import EmailPanel from './EmailPanel';
import FirebasePanel from './FirebasePanel';
import ProjectDetailsPanel from './ProjectDetailsPanel';
import SdkKeysPanel from './SdkKeysPanel';
import SettingsStatus from './SettingsStatus';

const tabs = ['Project & company details', 'Firebase / FCM', 'Domain', 'SDK keys', 'Data & privacy', 'Danger zone'];

function ProjectAndCompanyDetailsPanel() {
  return <Stack gap={2.5}>
    <Box>
      <Typography variant="h3">Project & company details</Typography>
      <Typography color="text.secondary" fontSize="var(--fs-12)">Manage the active Project identity and the company details connected to this workspace.</Typography>
    </Box>
    <ProjectDetailsPanel showHeading={false} />
  </Stack>;
}

// ponytail: static until the backend has privacy settings; wire it like EmailPanel then.
function PrivacyPanel() { return <Stack gap={2.5}><Box><Typography variant="h3">Data & privacy</Typography><Typography color="text.secondary" fontSize="var(--fs-12)">Control consent, retention and deletion behavior for this Project.</Typography></Box><Card className="saas-card">{[['Tracking enabled','Accept SDK events from identified users','Enabled'],['Marketing consent','Respect customer-provided email and push consent','Enabled'],['Location data','Only collect where legally permitted','Disabled']].map(([a,b,c]) => <Stack direction="row" alignItems="center" key={a} sx={{ py: 1.5, borderBottom: '1px solid #eeeaf3' }}><Box sx={{ flex: 1 }}><Typography fontWeight={600} fontSize="var(--fs-13)">{a}</Typography><Typography color="text.secondary" fontSize="var(--fs-12)">{b}</Typography></Box><SettingsStatus>{c}</SettingsStatus></Stack>)}</Card></Stack>; }

const panels: Record<string, (props: { onNavigate?: (tab: string) => void }) => JSX.Element> = {
  'Project & company details': ProjectAndCompanyDetailsPanel,
  'Firebase / FCM': FirebasePanel,
  Domain: EmailPanel,
  'SDK keys': SdkKeysPanel,
  'Data & privacy': PrivacyPanel,
  'Danger zone': DangerZonePanel,
};

export default function ProjectSettingsCenter({ initialTab = 'Project & company details' }: { initialTab?: string }) {
  const pathname = usePathname();
  const [tab, setTab] = useState(initialTab);
  const routes: Record<string, string> = {
    'Firebase / FCM': '/dashboard/settings/firebase',
    Domain: '/dashboard/settings/domain',
    'SDK keys': '/dashboard/settings/sdk-keys',
  };
  const routeTab = pathname.endsWith('/firebase') ? 'Firebase / FCM' : pathname.endsWith('/domain') ? 'Domain' : pathname.endsWith('/sdk-keys') ? 'SDK keys' : null;
  useEffect(() => {
    if (routeTab) setTab(routeTab);
  }, [routeTab]);
  const Panel = panels[tab] ?? ProjectDetailsPanel;
  return <Box className="settings-layout"><Tabs value={tab} onChange={(_, value) => setTab(value)}>{tabs.map((item) => routes[item] ? <Tab key={item} value={item} label={item} component={Link} href={routes[item]} /> : <Tab key={item} value={item} label={item} />)}</Tabs><Box className="settings-panel"><Panel onNavigate={setTab} /></Box></Box>;
}
