import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AnalyticsWidgetsSection from '@/components/dashboard/AnalyticsWidgetsSection';
import { chunks, niceMax, toPath } from '@/components/dashboard/analytics/Charts';
import { getDemoAnalytics } from '@/components/dashboard/analytics/demo-data';

vi.mock('@/components/dashboard/DashboardFrame', () => ({ default: ({ action, children }: { action: ReactNode; children: ReactNode }) => <div>{action}{children}</div> }));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: { name: 'Acme' }, isPending: false }) }));
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
    expect(screen.getAllByText(/vs previous 30 days/)).toHaveLength(6);
    await userEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(screen.getAllByText(/vs previous 7 days/)).toHaveLength(6);

    const empty = screen.getByRole('status');
    expect(empty).toHaveTextContent('No custom widgets yet');
    await userEvent.click(within(empty).getByRole('button', { name: 'Add widget' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Retention pulse/ }));
    expect(screen.queryByText('No custom widgets yet')).not.toBeInTheDocument();
    // The page behind the dialog is hidden until the dialog has finished closing.
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Retention pulse' }));
    expect(screen.getByText('No custom widgets yet')).toBeInTheDocument();
  });
});
