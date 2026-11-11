'use client';

import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useHubspotSettings } from '@/hooks/projects/use-project-settings';

export type IntegrationStatus = { label: string; tone: 'success' | 'warning' | 'neutral' } | null;

export type Integration = {
  id: string;
  name: string;
  category: string;
  summary: string;
  href: string;
  Logo: () => JSX.Element;
  /** Connection state for the active Project; null = not connected. */
  useStatus: () => IntegrationStatus;
};

/** HubSpot's orange sprocket, simplified. */
export function HubspotLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="HubSpot">
      <rect width="40" height="40" rx="9" fill="#ff7a59" />
      <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
        <circle cx="23" cy="23" r="5.2" />
        <path d="M23 17.8V11.5M18.9 19.6 12.6 14.2M19.3 26.6 14.6 30.6" />
      </g>
      <circle cx="23" cy="10" r="2.4" fill="#fff" />
      <circle cx="11.5" cy="13.2" r="2.1" fill="#fff" />
      <circle cx="13.6" cy="31.5" r="1.9" fill="#fff" />
    </svg>
  );
}

function useHubspotStatus(): IntegrationStatus {
  const { active } = useActiveProject();
  const hubspot = useHubspotSettings(active?.id).query.data;
  if (!hubspot?.connected) return null;
  if (hubspot.status === 'error') return { label: 'Needs attention', tone: 'warning' };
  if (!hubspot.syncEnabled) return { label: 'Paused', tone: 'neutral' };
  return { label: 'Connected', tone: 'success' };
}

/** Every integration the dashboard offers. A new one is an entry here plus its page under /dashboard/integrations. */
export const INTEGRATIONS: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    summary: 'Two-way contact sync: HubSpot contacts become PixlPush users, and new PixlPush users are added to HubSpot.',
    href: '/dashboard/integrations/hubspot',
    Logo: () => <HubspotLogo />,
    useStatus: useHubspotStatus,
  },
];
