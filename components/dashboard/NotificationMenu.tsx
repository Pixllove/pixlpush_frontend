'use client';

import { useState } from 'react';
import { Badge, Box, IconButton, Popover, Stack, Typography } from '@mui/material';
import { NotificationsNoneRounded } from '@mui/icons-material';
import { useMarkAllNotificationsRead, useNotificationRealtime, useNotificationUnreadCount } from '@/hooks/notifications/use-notifications';
import NotificationInbox from './NotificationInbox';

export default function NotificationMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useNotificationRealtime();
  const unreadQuery = useNotificationUnreadCount();
  const markAll = useMarkAllNotificationsRead();
  const unreadCount = unreadQuery.data?.count ?? 0;
  const open = Boolean(anchor);

  return (
    <>
      <IconButton
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ color: '#6e6a75' }}
      >
        <Badge badgeContent={unreadCount || undefined} color="primary" overlap="circular">
          <NotificationsNoneRounded />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: { xs: 360, sm: 470 },
            maxWidth: 'calc(100vw - 24px)',
            mt: 1.5,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(85,23,184,.14)',
            boxShadow: '0 24px 64px rgba(35, 16, 55, .18)',
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2.25, background: 'linear-gradient(135deg, #f4effd 0%, #fff7f3 100%)', borderBottom: '1px solid rgba(85,23,184,.12)' }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#5517b8,#ff5a2c)', boxShadow: '0 8px 18px rgba(85,23,184,.2)' }}>
              <NotificationsNoneRounded fontSize="small" />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize="var(--fs-16)">Notifications</Typography>
              <Typography color="text.secondary" fontSize="var(--fs-12)">
                {unreadQuery.isPending ? 'Checking for updates…' : unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
              </Typography>
            </Box>
          </Stack>
          {unreadCount > 0 && (
            <Typography component="button" disabled={markAll.isPending} onClick={() => markAll.mutate(undefined)} sx={{ border: 0, bgcolor: 'rgba(85,23,184,.08)', borderRadius: 2, px: 1.25, py: .8, color: 'primary.main', cursor: markAll.isPending ? 'wait' : 'pointer', fontSize: 'var(--fs-12)', fontWeight: 600, '&:hover': { bgcolor: 'rgba(85,23,184,.15)' }, '&:disabled': { opacity: .6 } }}>
              {markAll.isPending ? 'Updating…' : 'Mark all read'}
            </Typography>
          )}
        </Stack>
        <NotificationInbox compact enabled={open} onNavigate={() => setAnchor(null)} />
      </Popover>
    </>
  );
}
