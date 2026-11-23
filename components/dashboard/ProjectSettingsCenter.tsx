'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Button, Card, Stack, Tab, Tabs, Typography } from '@mui/material';

import DangerZonePanel from './DangerZonePanel';
import EmailPanel from './EmailPanel';
import FirebasePanel from './FirebasePanel';
import ProjectDetailsPanel from './ProjectDetailsPanel';
import BusinessSetupPanel from './BusinessSetupPanel';
import SdkKeysPanel from './SdkKeysPanel';
import DataSyncPanel from './DataSyncPanel';
import SettingsStatus from './SettingsStatus';

const tabs = ['Project', 'Business details', 'Push setup', 'Domain', 'SDK keys', 'Data Sync', 'Data & privacy', 'Danger zone'];

function ProjectPanel() {
  return <Stack gap={2.5}>
    <Box>
      <Typography variant="h3">Project</Typography>
      <Typography color="text.secondary" fontSize="var(--fs-12)">Manage the identity and environment settings for the active Project.</Typography>
    </Box>
    <ProjectDetailsPanel showHeading={false} showBusinessContext={false} />
  </Stack>;
}

function BusinessDetailsPanel() {
  return <Stack gap={2.5}>
    <Box>
      <Typography variant="h3">Business details</Typography>
      <Typography color="text.secondary" fontSize="var(--fs-12)">Manage your company information and the business context used for journeys and campaign content.</Typography>
    </Box>
    <ProjectDetailsPanel showHeading={false} showProjectFields={false} />
    <BusinessSetupPanel />
  </Stack>;
}

// ponytail: static until the backend has privacy settings; wire it like EmailPanel then.
function PrivacyPanel() { return <Stack gap={2.5}><Box><Typography variant="h3">Data & privacy</Typography><Typography color="text.secondary" fontSize="var(--fs-12)">Control consent, retention and deletion behavior for this Project.</Typography></Box><Card className="saas-card">{[['Tracking enabled','Accept SDK events from identified users','Enabled'],['Marketing consent','Respect customer-provided email and push consent','Enabled'],['Location data','Only collect where legally permitted','Disabled']].map(([a,b,c]) => <Stack direction="row" alignItems="center" key={a} sx={{ py: 1.5, borderBottom: '1px solid #eeeaf3' }}><Box sx={{ flex: 1 }}><Typography fontWeight={600} fontSize="var(--fs-13)">{a}</Typography><Typography color="text.secondary" fontSize="var(--fs-12)">{b}</Typography></Box><SettingsStatus>{c}</SettingsStatus></Stack>)}</Card></Stack>; }

const panels: Record<string, (props: { onNavigate?: (tab: string) => void }) => JSX.Element> = {
  Project: ProjectPanel,
  'Business details': BusinessDetailsPanel,
  'Push setup': FirebasePanel,
  Domain: EmailPanel,
  'SDK keys': SdkKeysPanel,
  'Data Sync': DataSyncPanel,
  'Data & privacy': PrivacyPanel,
  'Danger zone': DangerZonePanel,
};

export default function ProjectSettingsCenter({ initialTab = 'Project' }: { initialTab?: string }) {
  const pathname = usePathname();
  const [tab, setTab] = useState(initialTab);
  const routes: Record<string, string> = {
    'Push setup': '/dashboard/settings/firebase',
    Domain: '/dashboard/settings/domain',
    'SDK keys': '/dashboard/settings/sdk-keys',
    'Data Sync': '/dashboard/settings/data-sync',
  };
  const routeTab = pathname.endsWith('/firebase') ? 'Push setup' : pathname.endsWith('/domain') ? 'Domain' : pathname.endsWith('/sdk-keys') ? 'SDK keys' : pathname.endsWith('/data-sync') ? 'Data Sync' : null;
  useEffect(() => {
    if (routeTab) setTab(routeTab);
  }, [routeTab]);
  const Panel = panels[tab] ?? ProjectDetailsPanel;
  return <Box className="settings-layout"><Tabs value={tab} onChange={(_, value) => setTab(value)}>{tabs.map((item) => routes[item] ? <Tab key={item} value={item} label={item} component={Link} href={routes[item]} /> : <Tab key={item} value={item} label={item} />)}</Tabs><Box className="settings-panel"><Panel onNavigate={setTab} /></Box></Box>;
}
