'use client';

import {
  BarChartOutlined, BoltOutlined, EmailOutlined, GroupsOutlined, HistoryOutlined, InsightsOutlined,
  PeopleAltOutlined, SettingsOutlined, SpaceDashboardOutlined, TuneOutlined,
} from '@mui/icons-material';
import { Button } from '@mui/material';
import { useState } from 'react';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useActiveProject, planLabel } from '@/hooks/projects/use-active-project';

// DESIGN.md: Inter carries every interface role. Loaded here because the sidebar is the only part built on it so far.
const inter = Inter({ subsets: ['latin'], display: 'swap' });

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

export default function DashboardSidebar({ active, setActive, mobileOpen }: { active: string; setActive: (value: string) => void; mobileOpen: boolean }) {
  const { active: activeProject, isPending } = useActiveProject();
  // The clicked item lights up at once, before the next page has arrived, so a click never looks ignored.
  const [clicked, setClicked] = useState<string | null>(null);
  const current = clicked ?? active;
  const projectName = activeProject?.name ?? (isPending ? 'Loading…' : 'No project');

  return (
    <aside className={`dashboard-sidebar ${inter.className} ${mobileOpen ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo.png" alt="PixlPush" />
      </div>
      <nav className="sidebar-scroll" aria-label="Dashboard">
        {groups.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <p className="sidebar-kicker">{group.label}</p>
            <div className="sidebar-list">
              {group.items.map(({ label, href, icon: Icon }) => (
                // `prefetch`: the whole next page is fetched ahead of the click, so it opens without a wait.
                <Button
                  key={label}
                  component={Link}
                  href={href}
                  prefetch
                  disableRipple
                  onClick={() => { setClicked(label); setActive(label); }}
                  className={current === label ? 'dashboard-nav active' : 'dashboard-nav'}
                  aria-current={current === label ? 'page' : undefined}
                  startIcon={<Icon />}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-project">
          <span className="sidebar-project-mark" aria-hidden="true">{activeProject ? activeProject.name.charAt(0) : '+'}</span>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-project-name">{projectName}</div>
            <div className="sidebar-project-meta">{activeProject ? planLabel(activeProject) : 'Not set up yet'}</div>
          </div>
          <span className={`sidebar-project-status ${activeProject ? 'is-live' : ''}`} title={activeProject ? 'Active project' : 'No project yet'} />
        </div>
      </div>
    </aside>
  );
}
