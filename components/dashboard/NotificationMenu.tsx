'use client';

import { useMemo, useState } from 'react';
import { Badge, Box, Divider, IconButton, List, ListItemButton, Popover, Stack, Typography } from '@mui/material';
import { CheckRounded, NotificationsNoneRounded } from '@mui/icons-material';

type ProductNotification = { id: number; title: string; body: string; time: string; tone: string; read: boolean };

const initialNotifications: ProductNotification[] = [
  { id: 1, title: 'Audience group updated', body: 'Premium subscribers finished evaluating 1,982 users.', time: '8 min ago', tone: '#7132d3', read: false },
  { id: 2, title: 'Lifecycle segment activity', body: 'New users · 7 days has 4,218 members.', time: '21 min ago', tone: '#2b9b69', read: false },
  { id: 3, title: 'Campaign ready to send', body: 'Your welcome-back campaign is ready for review.', time: '1 hr ago', tone: '#ef6a35', read: false },
  { id: 4, title: 'SDK event received', body: 'PixlPush received new events from test project.', time: '3 hrs ago', tone: '#5c63d8', read: true },
  { id: 5, title: 'Project health report', body: 'Your project is healthy and reachability is trending up.', time: 'Yesterday', tone: '#718096', read: true },
];

export default function NotificationMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = useMemo(() => notifications.filter(item => !item.read).length, [notifications]);
  const markRead = (id: number) => setNotifications(current => current.map(item => item.id === id ? { ...item, read: true } : item));
  const markAllRead = () => setNotifications(current => current.map(item => ({ ...item, read: true })));
  return <>
    <IconButton aria-label={`${unreadCount} unread notifications`} onClick={event => setAnchor(event.currentTarget)} sx={{ color: '#6e6a75' }}>
      <Badge badgeContent={unreadCount || undefined} color="primary" overlap="circular"><NotificationsNoneRounded /></Badge>
    </IconButton>
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: { xs: 350, sm: 420 }, maxWidth: 'calc(100vw - 24px)', mt: 1.5, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(113,50,211,.12)', boxShadow: '0 22px 55px rgba(35, 16, 55, .22)' } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2.2, background: 'linear-gradient(135deg, #f5edff 0%, #fff5f1 100%)', borderBottom: '1px solid rgba(113,50,211,.12)' }}><Stack direction="row" alignItems="center" gap={1.2}><Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#7132d3,#ee653d)', boxShadow: '0 7px 16px rgba(113,50,211,.22)' }}><NotificationsNoneRounded fontSize="small" /></Box><Box><Typography fontWeight={600} fontSize={16}>Notifications</Typography><Typography color="text.secondary" fontSize={11}>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</Typography></Box></Stack>{unreadCount > 0 && <Typography component="button" onClick={markAllRead} sx={{ border: 0, bgcolor: 'rgba(113,50,211,.08)', borderRadius: 2, px: 1.2, py: .8, color: 'primary.main', cursor: 'pointer', fontSize: 11, fontWeight: 500, '&:hover': { bgcolor: 'rgba(113,50,211,.15)' } }}>Mark all as read</Typography>}</Stack>
      <Divider />
      <List disablePadding sx={{ p: 1 }}>{notifications.map(item => <ListItemButton key={item.id} onClick={() => markRead(item.id)} sx={{ px: 1.5, py: 1.6, mb: .6, alignItems: 'flex-start', borderRadius: 1.5, borderLeft: `3px solid ${item.read ? '#d7dbe2' : item.tone}`, bgcolor: item.read ? '#fff' : '#fbf8ff', '&:hover': { bgcolor: item.read ? '#f8f8fa' : '#f3ebff', transform: 'translateX(2px)' }, transition: 'all .18s ease' }}><Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: item.read ? '#eef0f3' : `${item.tone}18`, mt: .1, mr: 1.4, flexShrink: 0 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.read ? '#c7cbd3' : item.tone }} /></Box><Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" justifyContent="space-between" gap={1}><Typography fontSize={12} fontWeight={item.read ? 500 : 500} color={item.read ? '#777b86' : '#28173f'}>{item.title}</Typography>{item.read && <CheckRounded sx={{ fontSize: 15, color: '#aeb4be' }} />}</Stack><Typography fontSize={11} color={item.read ? '#9aa0aa' : '#716a7c'} sx={{ mt: .45, lineHeight: 1.45 }}>{item.body}</Typography><Typography fontSize={11} color="#a4a8b0" sx={{ mt: .8, fontWeight: 500 }}>{item.time}</Typography></Box></ListItemButton>)}</List>
    </Popover>
  </>;
}
