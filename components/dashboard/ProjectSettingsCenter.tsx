'use client';

import { useState } from 'react';
import { Box, Button, Card, Stack, Tab, Tabs, Typography } from '@mui/material';

import DangerZonePanel from './DangerZonePanel';
import EmailPanel from './EmailPanel';
import FirebasePanel from './FirebasePanel';
import ProjectDetailsPanel from './ProjectDetailsPanel';
import SdkKeysPanel from './SdkKeysPanel';
import SendingDomainsPanel from './sending-domains/SendingDomainsPanel';
import SettingsStatus from './SettingsStatus';

const tabs = ['Project details', 'Firebase / FCM', 'Email sending', 'Sending domains', 'SDK keys', 'Data & privacy', 'Danger zone'];

// ponytail: static until the backend has privacy settings; wire it like EmailPanel then.
function PrivacyPanel() { return <Stack gap={2.5}><Box><Typography variant="h3">Data & privacy</Typography><Typography color="text.secondary" fontSize={12}>Control consent, retention and deletion behavior for this Project.</Typography></Box><Card className="saas-card">{[['Tracking enabled','Accept SDK events from identified users','Enabled'],['Marketing consent','Respect customer-provided email and push consent','Enabled'],['Location data','Only collect where legally permitted','Disabled']].map(([a,b,c]) => <Stack direction="row" alignItems="center" key={a} sx={{ py: 1.5, borderBottom: '1px solid #eeeaf3' }}><Box sx={{ flex: 1 }}><Typography fontWeight={600} fontSize={13}>{a}</Typography><Typography color="text.secondary" fontSize={12}>{b}</Typography></Box><SettingsStatus>{c}</SettingsStatus></Stack>)}</Card></Stack>; }

const panels: Record<string, () => JSX.Element> = {
  'Firebase / FCM': FirebasePanel,
  'Email sending': EmailPanel,
  'Sending domains': SendingDomainsPanel,
  'SDK keys': SdkKeysPanel,
  'Data & privacy': PrivacyPanel,
  'Danger zone': DangerZonePanel,
};

export default function ProjectSettingsCenter({ initialTab = 'Project details' }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab);
  const Panel = panels[tab] ?? ProjectDetailsPanel;
  return <Box className="settings-layout"><Tabs value={tab} onChange={(_, value) => setTab(value)}>{tabs.map(item => <Tab key={item} value={item} label={item} />)}</Tabs><Box className="settings-panel"><Panel /></Box></Box>;
}
