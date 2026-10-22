'use client';

import { useState } from 'react';
import { Box, Card } from '@mui/material';
import { NotificationsNoneRounded, SettingsOutlined } from '@mui/icons-material';
import NotificationPreferences from '@/components/auth/NotificationPreferences';
import NotificationInbox from '@/components/dashboard/NotificationInbox';
import SegmentedTabs from '@/components/dashboard/SegmentedTabs';

type NotificationView = 'inbox' | 'settings';

export default function NotificationWorkspace() {
  const [view, setView] = useState<NotificationView>('inbox');

  return (
    <Box className="notification-workspace">
      <Box className="notification-workspace-toolbar">
        <SegmentedTabs
          value={view}
          options={[
            { value: 'inbox', label: 'Inbox', icon: <NotificationsNoneRounded fontSize="small" /> },
            { value: 'settings', label: 'Notification settings', icon: <SettingsOutlined fontSize="small" /> },
          ]}
          onChange={setView}
          ariaLabel="Notification view"
          className="notification-workspace-tabs"
        />
      </Box>

      <Box
        className="notification-workspace-panel"
        key={view}
        role="tabpanel"
        aria-label={view === 'inbox' ? 'Notification inbox' : 'Notification settings'}
      >
        {view === 'inbox' ? <NotificationInbox /> : (
          <Card className="notification-settings-page-card">
            <NotificationPreferences embedded />
          </Card>
        )}
      </Box>
    </Box>
  );
}
