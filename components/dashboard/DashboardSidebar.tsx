'use client';

import {
  AddRounded, BarChartOutlined, BoltOutlined, ChevronLeftRounded, ChevronRightRounded, DescriptionOutlined, EmailOutlined, GroupsOutlined,
  HistoryOutlined, HomeOutlined, InsightsOutlined, NotificationsNoneOutlined, PeopleAltOutlined, PersonOutlineOutlined, SettingsOutlined, SpaceDashboardOutlined, SupportAgentOutlined, TuneOutlined, UnfoldMoreRounded, ChecklistRounded,
  MapOutlined,
} from '@mui/icons-material';
import {
  Avatar, ButtonBase, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, Typography,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveProject, planLabel } from '@/hooks/projects/use-active-project';
import { firebaseApi, onboardingApi } from '@/lib/projects/api';
import { onboardingPercentage } from '@/lib/onboarding';
import { useNotificationUnreadCount } from '@/hooks/notifications/use-notifications';

const groups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', href: '/dashboard', icon: HomeOutlined },
      { label: 'Analytics', href: '/dashboard/analytics', icon: InsightsOutlined },
      { label: 'Users', href: '/dashboard/users', icon: PeopleAltOutlined },
      { label: 'Email', href: '/dashboard/email', icon: EmailOutlined },
      { label: 'Push Notifications', href: '/dashboard/push', icon: BoltOutlined },
      { label: 'Journey Automations', href: '/dashboard/journeys', icon: InsightsOutlined },
    ],
  },
  {
    label: 'Project',
    items: [
      { label: 'Onboarding Guide', href: '/dashboard/onboarding', icon: ChecklistRounded },
      { label: 'SDK Integration Guide', href: '/dashboard/integrations/react-native/quickstart', icon: TuneOutlined },
      { label: 'Developer documentation', href: '/dashboard/developer-docs', icon: DescriptionOutlined },
      { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: HistoryOutlined },
      { label: 'Notifications', href: '/dashboard/notifications', icon: NotificationsNoneOutlined },
      { label: 'Ideas & Roadmap', href: '/dashboard/roadmap', icon: MapOutlined },
      { label: 'Billing & Usage', href: '/dashboard/billing', icon: BarChartOutlined },
      { label: 'Team & Access', href: '/dashboard/team', icon: GroupsOutlined },
      { label: 'Project Settings', href: '/dashboard/settings', icon: SettingsOutlined },
      { label: 'Profile', href: '/dashboard/account', icon: PersonOutlineOutlined },
    ],
  },
];

export default function DashboardSidebar({ active, setActive, mobileOpen, collapsed, onToggleCollapse, onChangeProject, onOpenSupport, onCloseSupport, supportUnread = 0 }: {
  active: string;
  setActive: (value: string) => void;
  mobileOpen: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** A Project id, or `create` to start a new one. */
  onChangeProject: (value: string) => void;
  onOpenSupport: () => void;
  onCloseSupport: () => void;
  supportUnread?: number;
}) {
  const { projects, active: activeProject, isPending } = useActiveProject();
  const unreadNotifications = useNotificationUnreadCount();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  useEffect(() => setClicked(null), [active]);
  const onboarding = useQuery({
    queryKey: ['projects', activeProject?.id, 'onboarding'],
    queryFn: () => onboardingApi.get(activeProject!.id),
    enabled: Boolean(activeProject?.id),
    staleTime: 30_000,
  });
  const firebase = useQuery({
    queryKey: ['projects', activeProject?.id, 'firebase'],
    queryFn: () => firebaseApi.get(activeProject!.id),
    enabled: Boolean(activeProject?.id),
    staleTime: 30_000,
  });
  const current = clicked ?? active;
  const unreadNotificationCount = unreadNotifications.data?.count ?? 0;
  const projectName = activeProject?.name ?? (isPending ? 'Loading…' : 'No project');
  const projectPlan = activeProject
    ? activeProject.status === 'deactivated'
      ? `Deactivated${activeProject.recoveryUntil ? ` · restores ${formatShortDate(activeProject.recoveryUntil)}` : ''}`
      : planLabel(activeProject)
    : 'Not set up yet';
  const onboardingPercent = !activeProject
    ? '0%'
    : onboarding.data && !onboarding.isPending && !firebase.isPending
      ? `${onboardingPercentage({ ...onboarding.data, completed: Array.from(new Set([1, ...onboarding.data.completed])) }, firebase.data?.status === 'connected')}%`
      : '…';
  const switchProject = (value: string) => { setMenu(null); onChangeProject(value); };

  return (
    <aside className={`dashboard-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="PixlPush navigation">
      <header className="sidebar-brand">
        <Link className="sidebar-brand-lockup" href="/dashboard" aria-label="PixlPush home">
          <Image className="sidebar-brand-mark" src="/assets/site-icon.webp" alt="" aria-hidden="true" width={21} height={31} priority />
          <Image className="sidebar-brand-wordmark" src="/assets/logo-header.webp" alt="PixlPush" width={104} height={37} priority />
        </Link>
        <IconButton
          className="sidebar-collapse-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="dashboard-sidebar-navigation"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapse}
          size="small"
        >
          {collapsed ? <ChevronRightRounded /> : <ChevronLeftRounded />}
        </IconButton>
      </header>

      <div className="sidebar-switch">
        <Tooltip title={collapsed && !menu ? `${projectName} · ${projectPlan}` : ''} placement="right">
          <ButtonBase
            className="sidebar-project"
            aria-label={`Project: ${projectName}. Switch project`}
            aria-haspopup="menu"
            aria-expanded={Boolean(menu)}
            onClick={(event) => setMenu(event.currentTarget)}
          >
            <Avatar className="sidebar-project-mark" src={activeProject?.logoUrl ?? undefined} aria-hidden="true">{activeProject ? activeProject.name.charAt(0) : '+'}</Avatar>
            <span className="sidebar-project-copy">
              <span className="sidebar-project-name">{projectName}</span>
              <span className="sidebar-project-meta">{projectPlan}</span>
            </span>
            <UnfoldMoreRounded className="sidebar-project-chevron" />
          </ButtonBase>
        </Tooltip>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} slotProps={{ paper: { sx: { minWidth: 220 } } }}>
          {projects.map((project) => (
            <MenuItem key={project.id} selected={project.id === activeProject?.id} onClick={() => switchProject(project.id)}>
               <Typography component="span" variant="inherit" noWrap>{project.name}</Typography>
               <Typography component="span" variant="caption" color={project.status === 'deactivated' ? 'error.main' : 'text.secondary'} sx={{ ml: 'auto', pl: 2 }}>
                 {project.status === 'deactivated' ? 'Deactivated' : planLabel(project)}
               </Typography>
            </MenuItem>
          ))}
          {projects.length > 0 && <Divider />}
          <MenuItem onClick={() => switchProject('create')}><AddRounded fontSize="small" />Create project</MenuItem>
        </Menu>
      </div>

      <nav id="dashboard-sidebar-navigation" className="sidebar-navigation" aria-label="Primary navigation">
        {groups.map((group) => (
          <section className="sidebar-group" key={group.label} aria-label={group.label}>
            <p className="sidebar-kicker">{group.label}</p>
            <List className="sidebar-list" disablePadding>
              {group.items.map(({ label, href, icon: Icon }) => {
                const selected = current === label;
                return (
                  <Tooltip key={label} title={collapsed ? label : ''} placement="right">
                    <ListItemButton
                      component={Link}
                      href={href}
                      prefetch
                      className={`dashboard-nav${label === 'Onboarding Guide' ? ' onboarding-nav' : ''}${selected ? ' active' : ''}`}
                      selected={selected}
                      aria-current={selected ? 'page' : undefined}
                      aria-label={collapsed ? label : undefined}
                      onClick={() => { setClicked(label); setActive(label); onCloseSupport(); }}
                    >
                      <ListItemIcon className="dashboard-nav-icon"><Icon /></ListItemIcon>
                      <ListItemText className="dashboard-nav-label" primary={label} />
                      {label === 'Onboarding Guide' && <span className="onboarding-nav-percent">{onboardingPercent}</span>}
                      {label === 'Notifications' && unreadNotificationCount > 0 && (
                        <span className="notifications-nav-count" aria-label={`${unreadNotificationCount} unread notifications`}>
                          {formatNotificationCount(unreadNotificationCount)}
                        </span>
                      )}
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </List>
          </section>
        ))}
      </nav>

      <div className="sidebar-support">
        <Tooltip title={collapsed ? 'Contact support' : ''} placement="right">
          <ListItemButton
            className={`dashboard-nav sidebar-support-link${current === 'Contact support' ? ' active' : ''}`}
            selected={current === 'Contact support'}
            onClick={() => { setClicked('Contact support'); setActive('Contact support'); onOpenSupport(); }}
            aria-current={current === 'Contact support' ? 'page' : undefined}
            aria-label="Contact support"
          >
            <ListItemIcon className="dashboard-nav-icon"><SupportAgentOutlined /></ListItemIcon>
            <ListItemText className="dashboard-nav-label" primary="Contact support" />
            {supportUnread > 0 && <span className="support-nav-count" aria-label={`${supportUnread} unread support messages`}>{formatNotificationCount(supportUnread)}</span>}
          </ListItemButton>
        </Tooltip>
      </div>

    </aside>
  );
}

function formatNotificationCount(count: number): string {
  if (count > 999) return '999+';
  if (count > 99) return '99+';
  return String(count);
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'later' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

