import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AnalyticsWidgetsSection from '@/components/dashboard/AnalyticsWidgetsSection';
import { chunks, niceMax, toPath } from '@/components/dashboard/analytics/Charts';
import { getDemoAnalytics } from '@/components/dashboard/analytics/demo-data';

const { analyticsOverview, analyticsCampaigns } = vi.hoisted(() => ({
  analyticsOverview: {
    health: { messagesSent: 10, deliveredRate: 98, metricsTrendingUp: 4, metricsTotal: 6 },
    summary: {
      reachableUsers: { value: 20, changePercent: 5 }, emailSends: { value: 6, changePercent: 10 }, pushSends: { value: 4, changePercent: 8 },
      emailOpenRate: { value: 40, changePoints: 2 }, pushClickRate: { value: 8, changePoints: -1 }, eventsReceived: { value: 100, changePercent: 12 },
    },
    sendsOverTime: { series: [{ bucket: '2026-10-13T00:00:00.000Z', emailSends: 6, pushSends: 4, emailOpenRate: 40, pushClickRate: 8, events: 100 }] },
    engagementOverTime: { series: [] },
    channelPerformance: { email: { sent: 6, deliveryRate: 98, openRate: 40 }, push: { sent: 4, deliveryRate: 97, clickRate: 8 } },
  },
  analyticsCampaigns: { items: [{ id: 'campaign-1', name: 'Welcome', channel: 'email', sent: 6, openRate: 40, clickRate: 0, engagementRate: 40 }] },
}));

vi.mock('@/lib/projects/analytics', () => {
  let selected: string[] = [];
  const preference = () => ({ selected, layout: [], available: [], widgets: selected.map((id) => ({ id, data: {} })), updatedAt: null });
  return {
    analyticsApi: {
      overview: vi.fn().mockResolvedValue(analyticsOverview),
      campaigns: vi.fn().mockResolvedValue(analyticsCampaigns),
      reachability: vi.fn().mockResolvedValue({ period: {}, total: 0, reachable: 0, emailOnly: 0, pushOnly: 0, both: 0, neither: 0, channels: [] }),
      activity: vi.fn().mockResolvedValue({ period: {}, totals: { events: 0, activeUsers: 0, sessions: 0, eventsPerActiveUser: 0 }, series: [], topEvents: [] }),
      lifecycle: vi.fn().mockResolvedValue({ period: {}, stages: [], retention: [], churn: { atRisk: 0, inactive14d: 0, inactive30d: 0, signals: [] } }),
      demographics: vi.fn().mockResolvedValue({ period: {}, countries: [], platforms: [], devices: [], appVersions: [] }),
      emailDeliveries: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 }),
      pushDeliveries: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 }),
      journeyActivity: vi.fn().mockResolvedValue({ metrics: { entered: 0, active: 0, completed: 0, exited: 0, failed: 0, exitReasons: {}, push: {}, email: {} }, items: [], total: 0, page: 1, limit: 10 }),
      exportJson: vi.fn().mockResolvedValue({ period: {}, generatedAt: '', sections: {} }),
      widgets: vi.fn().mockImplementation(() => Promise.resolve(preference())),
      updateWidgets: vi.fn().mockImplementation((_projectId: string, input: { selected?: string[] }) => { selected = input.selected ?? selected; return Promise.resolve(preference()); }),
      removeWidget: vi.fn().mockImplementation((_projectId: string, id: string) => { selected = selected.filter((item) => item !== id); return Promise.resolve(preference()); }),
    },
  };
});

vi.mock('@/lib/projects/api', () => ({ journeysApi: { list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 }) } }));

vi.mock('@/components/dashboard/DashboardFrame', () => ({ default: ({ action, children }: { action: ReactNode; children: ReactNode }) => <div>{action}{children}</div> }));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: { id: 'project-1', name: 'Acme' }, isPending: false }) }));
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account: { name: 'Kamran Ahsan' } }) }));
vi.mock('@/components/dashboard/HomeCommandCenter', () => ({ greeting: () => 'Good morning' }));

describe('Analytics', () => {
  it('scales a chart to a round axis, draws through every value and groups days from the newest', () => {
    expect([0, 0.9, 47, 1180, 1900].map(niceMax)).toEqual([1, 1, 80, 1600, 2000]);
    expect(toPath([0, 10], 0, 10, 100, 100)).toBe('M0 100C50 100 50 0 100 0');
    expect(chunks([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1], [2, 3, 4], [5, 6, 7]]);
  });

  it('gives every range one value a day and a comparison for each metric', () => {
    for (const range of [7, 30, 90] as const) {
      const data = getDemoAnalytics(range, new Date('2026-10-13T12:00:00Z'));
      expect(data.labels).toHaveLength(range);
      expect(data.labels.at(-1)).toBe('Oct 13');
      expect(data.sends.email).toHaveLength(range);
      expect(data.kpis.map((kpi) => kpi.label)).toEqual(['Reachable users', 'Email sends', 'Push sends', 'Email open rate', 'Push click rate', 'Events received']);
    }
    expect(getDemoAnalytics(30)).toEqual(getDemoAnalytics(30));
  });

  it('changes the period, and adds and removes a widget from one empty state', async () => {
    render(<AnalyticsWidgetsSection />);
    expect(screen.getByRole('heading', { name: 'Good morning, Kamran.' })).toBeInTheDocument();
    expect(screen.getByText(/Live project health · Acme/)).toBeInTheDocument();
    expect(await screen.findAllByText(/vs previous 30 days/)).toHaveLength(6);
    await userEvent.click(screen.getByRole('tab', { name: 'Last 7 days' }));
    expect(await screen.findAllByText(/vs previous 7 days/)).toHaveLength(6);

    const empty = screen.getByRole('status');
    expect(empty).toHaveTextContent('No custom widgets yet');
    await userEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Retention pulse/ }));
    expect(screen.queryByText('No custom widgets yet')).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add another widget' })).toBeInTheDocument());
    // The page behind the dialog is hidden until the dialog has finished closing.
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Retention pulse' }));
    expect(screen.getByText('No custom widgets yet')).toBeInTheDocument();
  });
});
