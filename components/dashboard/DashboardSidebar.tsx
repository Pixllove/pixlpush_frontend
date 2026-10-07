'use client';

import {
  BarChartOutlined, BoltOutlined, EmailOutlined, GroupsOutlined,
  HistoryOutlined, InsightsOutlined, PeopleAltOutlined, SettingsOutlined, SpaceDashboardOutlined, TuneOutlined,
} from '@mui/icons-material';
import {
  Avatar, List, ListItemButton, ListItemIcon, ListItemText, Tooltip,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useActiveProject, planLabel } from '@/hooks/projects/use-active-project';

const groups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', href: '/dashboard', icon: SpaceDashboardOutlined },
      { label: 'Users', href: '/dashboard/users', icon: PeopleAltOutlined },
      { label: 'Email', href: '/dashboard/email', icon: EmailOutlined },
      { label: 'Push Notifications', href: '/dashboard/push', icon: BoltOutlined },
      { label: 'Journey Automations', href: '/dashboard/journeys', icon: InsightsOutlined },
    ],
  },
  {
    label: 'Project',
    items: [
      { label: 'Integrations', href: '/dashboard/integrations', icon: TuneOutlined },
      { label: 'Team & Access', href: '/dashboard/team', icon: GroupsOutlined },
      { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: HistoryOutlined },
      { label: 'Billing & Usage', href: '/dashboard/billing', icon: BarChartOutlined },
      { label: 'Settings', href: '/dashboard/settings', icon: SettingsOutlined },
    ],
  },
];

export default function DashboardSidebar({ active, setActive, mobileOpen, collapsed }: {
  active: string;
  setActive: (value: string) => void;
  mobileOpen: boolean;
  collapsed: boolean;
}) {
  const { active: activeProject, isPending } = useActiveProject();
  const [clicked, setClicked] = useState<string | null>(null);
  useEffect(() => setClicked(null), [active]);
  const current = clicked ?? active;
  const projectName = activeProject?.name ?? (isPending ? 'Loading…' : 'No project');

  return (
    <aside className={`dashboard-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="PixlPush navigation">
      <header className="sidebar-brand">
        <Link className="sidebar-brand-lockup" href="/dashboard" aria-label="PixlPush home">
          <Image className="sidebar-brand-mark" src="/assets/site-icon.png" alt="" aria-hidden="true" width={21} height={31} priority />
          <Image className="sidebar-brand-wordmark" src="/assets/logo.png" alt="PixlPush" width={104} height={37} priority />
        </Link>
      </header>

      <nav className="sidebar-navigation" aria-label="Primary navigation">
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
                      onClick={() => { setClicked(label); setActive(label); }}
                      className={`dashboard-nav${selected ? ' active' : ''}`}
                      selected={selected}
                      aria-current={selected ? 'page' : undefined}
                      aria-label={collapsed ? label : undefined}
                    >
                      <ListItemIcon className="dashboard-nav-icon"><Icon /></ListItemIcon>
                      <ListItemText className="dashboard-nav-label" primary={label} />
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </List>
          </section>
        ))}
      </nav>

      <footer className="sidebar-foot">
        <div className="sidebar-project" title={collapsed ? `${projectName} · ${activeProject ? planLabel(activeProject) : 'Not set up yet'}` : undefined}>
          <Avatar className="sidebar-project-mark" aria-hidden="true">{activeProject ? activeProject.name.charAt(0) : '+'}</Avatar>
          <div className="sidebar-project-copy">
            <div className="sidebar-project-name">{projectName}</div>
            <div className="sidebar-project-meta">{activeProject ? planLabel(activeProject) : 'Not set up yet'}</div>
          </div>
          <span className={`sidebar-project-status ${activeProject ? 'is-live' : ''}`} aria-label={activeProject ? 'Active project' : 'No project yet'} />
        </div>
      </footer>
    </aside>
  );
}
