'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountCircleRounded,
  CampaignRounded,
  CheckCircleOutlineRounded,
  CheckRounded,
  CloseRounded,
  CreditCardRounded,
  FolderRounded,
  GroupsRounded,
  HubRounded,
  MarkEmailUnreadRounded,
  NotificationsNoneRounded,
  RefreshRounded,
  SearchRounded,
  SecurityRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import {
  useDismissNotification,
  useInfiniteNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/notifications/use-notifications';
import type { AccountNotification, NotificationCategory, NotificationRecipient } from '@/types/notifications';
import { formatUserDateTime } from '@/lib/timezone';

const categoryLabels: Record<NotificationCategory, string> = {
  account: 'Account',
  security: 'Security',
  project: 'Project',
  onboarding: 'Onboarding',
  team: 'Team',
  billing: 'Billing',
  messaging: 'Messaging',
  integration: 'Integration',
  announcement: 'Announcement',
};

const categoryOptions = Object.entries(categoryLabels) as [NotificationCategory, string][];

const categoryStyles: Record<NotificationCategory, { color: string; background: string; Icon: typeof NotificationsNoneRounded }> = {
  account: { color: '#5b34b7', background: '#efe9fb', Icon: AccountCircleRounded },
  security: { color: '#b33b37', background: '#fbeceb', Icon: SecurityRounded },
  project: { color: '#2772a2', background: '#e8f3fa', Icon: FolderRounded },
  onboarding: { color: '#b16a10', background: '#fff3dd', Icon: CheckCircleOutlineRounded },
  team: { color: '#2d8b65', background: '#e7f6ef', Icon: GroupsRounded },
  billing: { color: '#8b4a9c', background: '#f6eafa', Icon: CreditCardRounded },
  messaging: { color: '#bd5a28', background: '#fff0e7', Icon: CampaignRounded },
  integration: { color: '#3866a6', background: '#eaf0fb', Icon: HubRounded },
  announcement: { color: '#aa3f63', background: '#fceaf0', Icon: MarkEmailUnreadRounded },
};

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const unit = units.find(([, size]) => absolute >= size);
  if (!unit) return 'Just now';
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(seconds / unit[1]), unit[0]);
}

function internalHref(notification: AccountNotification): string | null {
  const payload = notification.payload ?? {};
  for (const key of ['href', 'link', 'url']) {
    const value = payload[key];
    if (typeof value === 'string' && value.startsWith('/')) return value;
  }
  return null;
}

function NotificationRow({
  item,
  compact,
  onNavigate,
}: {
  item: NotificationRecipient;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const read = useMarkNotificationRead();
  const dismiss = useDismissNotification();
  const notification = item.notification;
  const style = categoryStyles[notification.category];
  const Icon = style.Icon;
  const href = internalHref(notification);
  const isUnread = !item.readAt;

  const open = () => {
    if (isUnread) read.mutate(notification.id);
    if (href) {
      router.push(href);
      onNavigate?.();
    }
  };

  return (
    <Box className="notification-row-shell" sx={{ position: 'relative', '&:hover .notification-dismiss': { opacity: 1 } }}>
      <ListItemButton
        className="notification-row"
        onClick={open}
        sx={{
          px: compact ? 1.5 : 2,
          py: compact ? 1.4 : 1.7,
          pr: 5.5,
          mb: .75,
          alignItems: 'flex-start',
          borderRadius: 2,
          border: '1px solid',
          borderColor: isUnread ? alpha(style.color, .17) : 'transparent',
          borderLeft: `3px solid ${isUnread ? style.color : '#d9dee6'}`,
          bgcolor: isUnread ? alpha(style.color, .035) : '#fff',
          '&:hover': { bgcolor: isUnread ? alpha(style.color, .08) : '#f8f7fa', transform: 'translateX(2px)' },
          transition: 'background-color .18s ease, transform .18s ease, border-color .18s ease',
        }}
      >
        <Box sx={{ width: compact ? 34 : 38, height: compact ? 34 : 38, borderRadius: 2, display: 'grid', placeItems: 'center', flexShrink: 0, mr: 1.4, color: isUnread ? style.color : '#8f97a4', bgcolor: isUnread ? style.background : '#eef0f3' }}>
          <Icon sx={{ fontSize: compact ? 18 : 20 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Typography fontSize="var(--fs-13)" fontWeight={isUnread ? 700 : 600} color={isUnread ? 'text.primary' : 'text.secondary'} sx={{ lineHeight: 1.35 }}>
              {notification.title}
            </Typography>
            <Tooltip title={formatUserDateTime(notification.createdAt)}>
              <Typography component="time" dateTime={notification.createdAt} fontSize="var(--fs-11)" color="text.disabled" whiteSpace="nowrap" sx={{ pt: .15 }}>
                {relativeTime(notification.createdAt)}
              </Typography>
            </Tooltip>
          </Stack>
          <Typography fontSize="var(--fs-12)" color={isUnread ? 'text.secondary' : 'text.disabled'} sx={{ mt: .55, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {notification.body}
          </Typography>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={.7} sx={{ mt: 1 }}>
            <Chip size="small" label={categoryLabels[notification.category]} sx={{ color: style.color, bgcolor: style.background, fontWeight: 600 }} />
            {notification.project && <Chip size="small" variant="outlined" label={notification.project.name} sx={{ maxWidth: compact ? 150 : 220, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />}
            {notification.priority === 'critical' && <Chip size="small" label="Important" sx={{ color: '#b33b37', bgcolor: '#fbeceb', fontWeight: 600 }} />}
            {isUnread && <Box aria-label="Unread" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: style.color, ml: .25 }} />}
          </Stack>
        </Box>
        {!isUnread && <CheckRounded sx={{ position: 'absolute', right: 13, bottom: 14, fontSize: 17, color: '#aeb4be' }} />}
      </ListItemButton>
      <Tooltip title="Dismiss notification">
        <IconButton
          className="notification-dismiss"
          size="small"
          aria-label={`Dismiss ${notification.title}`}
          disabled={dismiss.isPending}
          onClick={(event) => {
            event.stopPropagation();
            dismiss.mutate(notification.id);
          }}
          sx={{ position: 'absolute', right: 10, top: 10, opacity: { xs: 1, sm: 0 }, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: '#f5f3f7' }, transition: 'opacity .15s ease' }}
        >
          <CloseRounded sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function LoadingRows({ compact }: { compact: boolean }) {
  return (
    <Stack gap={.9} sx={{ p: compact ? 1 : 0 }}>
      {[1, 2, 3, 4].slice(0, compact ? 3 : 4).map((value) => (
        <Stack key={value} direction="row" gap={1.4} sx={{ p: compact ? 1.5 : 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Skeleton variant="rounded" width={compact ? 34 : 38} height={compact ? 34 : 38} />
          <Box sx={{ flex: 1 }}><Skeleton width="62%" /><Skeleton width="92%" /><Skeleton width="35%" /></Box>
        </Stack>
      ))}
    </Stack>
  );
}

export default function NotificationInbox({
  compact = false,
  enabled = true,
  onNavigate,
}: {
  compact?: boolean;
  enabled?: boolean;
  onNavigate?: () => void;
}) {
  const { projects } = useActiveProject();
  const markAll = useMarkAllNotificationsRead();
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState<NotificationCategory | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const search = useDeferredValue(searchInput.trim());
  const query = useMemo(() => ({
    limit: compact ? 8 : 30,
    projectId: projectId || undefined,
    category: category || undefined,
    search: search || undefined,
    unread: unreadOnly || undefined,
  }), [category, compact, projectId, search, unreadOnly]);
  const notifications = useInfiniteNotifications(query, enabled);
  const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];
  const unreadCount = items.filter((item) => !item.readAt).length;

  return (
    <Box className={`notification-inbox${compact ? ' is-compact' : ''}`} sx={{ bgcolor: '#fff', border: compact ? 'none' : '1px solid', borderColor: 'divider', borderRadius: compact ? 0 : 3, p: compact ? 0 : { xs: 1.5, sm: 2.5 } }}>
      {!compact && (
        <Box className="notification-inbox-header">
          <Box className="notification-inbox-heading">
            <Box className="notification-inbox-icon"><NotificationsNoneRounded fontSize="small" /></Box>
            <Box>
              <Typography className="notification-inbox-title">Your notification inbox</Typography>
              <Typography className="notification-inbox-subtitle">Account, project, team and security updates.</Typography>
            </Box>
          </Box>
          <Box className="notification-inbox-actions">
            <Box className="notification-inbox-count" aria-live="polite">
              <span className="notification-inbox-count-dot" aria-hidden="true" />
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Box>
            <Button size="small" variant="outlined" startIcon={<RefreshRounded />} onClick={() => void notifications.refetch()} disabled={notifications.isFetching}>Refresh</Button>
            <Button size="small" variant="text" startIcon={<CheckRounded />} onClick={() => markAll.mutate(undefined)} disabled={markAll.isPending}>Mark all read</Button>
          </Box>
        </Box>
      )}

      <Stack className="notification-filter-bar" direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ px: compact ? 1.5 : 0, pt: compact ? 1.2 : 0, pb: compact ? 1.2 : 1.5 }}>
        {!compact && <TextField value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search notifications" aria-label="Search notifications" sx={{ flex: 1, minWidth: 180 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} />}
        <FormControl size="small" sx={{ minWidth: compact ? '100%' : 160 }}>
          <InputLabel id={`notification-project-${compact ? 'menu' : 'page'}`}>Project</InputLabel>
          <Select labelId={`notification-project-${compact ? 'menu' : 'page'}`} value={projectId} label="Project" onChange={(event) => setProjectId(event.target.value)}>
            <MenuItem value="">All projects</MenuItem>
            {projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
          </Select>
        </FormControl>
        {!compact && <>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="notification-category">Category</InputLabel>
            <Select labelId="notification-category" value={category} label="Category" onChange={(event) => setCategory(event.target.value as NotificationCategory | '')}>
              <MenuItem value="">All categories</MenuItem>
              {categoryOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControlLabel control={<Checkbox checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} size="small" />} label={<Typography variant="body2">Unread only</Typography>} sx={{ mr: 0, whiteSpace: 'nowrap' }} />
        </>}
      </Stack>

      {compact && <Divider />}

      {notifications.isPending ? <LoadingRows compact={compact} /> : notifications.isError ? (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void notifications.refetch()}>Retry</Button>} sx={{ m: compact ? 1.5 : 0, borderRadius: 2 }}>
          We couldn’t load your notifications.
        </Alert>
      ) : items.length === 0 ? (
        <Box sx={{ textAlign: 'center', px: 3, py: compact ? 6 : 10, color: 'text.secondary' }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5, bgcolor: '#f2edf9', color: 'primary.main' }}>{unreadOnly || search ? <SearchRounded /> : <CheckCircleOutlineRounded />}</Box>
          <Typography fontWeight={700} color="text.primary">{unreadOnly ? 'No unread notifications' : search ? 'No matching notifications' : 'You’re all caught up'}</Typography>
          <Typography variant="body2" sx={{ mt: .5, maxWidth: 330, mx: 'auto' }}>Important account and project updates will appear here as they happen.</Typography>
        </Box>
      ) : (
        <>
          <List className="notification-results" disablePadding sx={{ p: compact ? 1 : 0 }}>{items.map((item) => <NotificationRow key={item.id} item={item} compact={compact} onNavigate={onNavigate} />)}</List>
          {notifications.hasNextPage && <Button fullWidth size="small" onClick={() => void notifications.fetchNextPage()} disabled={notifications.isFetchingNextPage} sx={{ mt: .5 }}>{notifications.isFetchingNextPage ? 'Loading…' : 'Load more notifications'}</Button>}
        </>
      )}
    </Box>
  );
}
